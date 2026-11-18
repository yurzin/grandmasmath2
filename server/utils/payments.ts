import { randomUUID } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'

export type PaymentState = 'pending' | 'succeeded' | 'canceled'

interface CreatePaymentInput {
    purchaseId: number
    amount: number
    description: string
    returnUrl: string
    customerEmail: string
}

interface PaymentProvider {
    name: 'yookassa' | 'mock'
    create(input: CreatePaymentInput): Promise<{ paymentId: string, confirmationUrl: string }>
    /** Статус платежа у провайдера (источник истины — не уведомление, а этот запрос). */
    fetch(paymentId: string): Promise<{ state: PaymentState, amount: number | null }>
}

// ---------- ЮKassa (REST API v3) ----------

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

function yookassaProvider(): PaymentProvider {
    const { yookassa } = useRuntimeConfig()
    const auth = `Basic ${Buffer.from(`${yookassa.shopId}:${yookassa.secretKey}`).toString('base64')}`
    const rub = (n: number) => ({ value: n.toFixed(2), currency: 'RUB' })

    return {
        name: 'yookassa',
        async create(input) {
            const receipt = yookassa.receipt === 'on'
                ? {
                        customer: { email: input.customerEmail },
                        items: [{
                            description: input.description.slice(0, 128),
                            quantity: '1.00',
                            amount: rub(input.amount),
                            vat_code: Number(yookassa.vatCode),
                            payment_mode: 'full_payment',
                            payment_subject: yookassa.paymentSubject,
                        }],
                    }
                : undefined
            const payment = await $fetch<{ id: string, confirmation?: { confirmation_url?: string } }>(`${YOOKASSA_API}/payments`, {
                method: 'POST',
                headers: { 'Authorization': auth, 'Idempotence-Key': randomUUID() },
                body: {
                    amount: rub(input.amount),
                    capture: true,
                    confirmation: { type: 'redirect', return_url: input.returnUrl },
                    description: input.description.slice(0, 128),
                    metadata: { purchaseId: String(input.purchaseId) },
                    receipt,
                },
            })
            if (!payment.confirmation?.confirmation_url) throw new Error('ЮKassa не вернула ссылку на оплату')
            return { paymentId: payment.id, confirmationUrl: payment.confirmation.confirmation_url }
        },
        async fetch(paymentId) {
            const payment = await $fetch<{ status: string, paid: boolean, amount: { value: string } }>(
                `${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`,
                { headers: { Authorization: auth } },
            )
            // waiting_for_capture не бывает: capture: true.
            const state: PaymentState = payment.status === 'succeeded' && payment.paid
                ? 'succeeded'
                : payment.status === 'canceled' ? 'canceled' : 'pending'
            return { state, amount: Number(payment.amount.value) }
        },
    }
}

// ---------- Тестовая оплата (только dev, без ЮKassa) ----------

const mockPayments = new Map<string, PaymentState>()

function mockProvider(): PaymentProvider {
    return {
        name: 'mock',
        async create(input) {
            const paymentId = `mock-${input.purchaseId}-${randomUUID().slice(0, 8)}`
            mockPayments.set(paymentId, 'pending')
            return { paymentId, confirmationUrl: `/purchases/mock-pay?payment=${paymentId}&purchase=${input.purchaseId}` }
        },
        async fetch(paymentId) {
            return { state: mockPayments.get(paymentId) ?? 'canceled', amount: null }
        },
    }
}

/** Только для страницы тестовой оплаты в dev. */
export function setMockPaymentState(paymentId: string, state: PaymentState) {
    if (!import.meta.dev) throw createError({ statusCode: 404 })
    if (!mockPayments.has(paymentId)) throw createError({ statusCode: 404, message: 'Тестовый платёж не найден' })
    mockPayments.set(paymentId, state)
}

export function paymentProvider(name?: string): PaymentProvider {
    const { yookassa } = useRuntimeConfig()
    if (name === 'mock' || (!name && !(yookassa.shopId && yookassa.secretKey))) {
        if (!import.meta.dev) throw createError({ statusCode: 503, message: 'Оплата пока не настроена' })
        return mockProvider()
    }
    if (!yookassa.shopId || !yookassa.secretKey) throw createError({ statusCode: 503, message: 'Оплата пока не настроена' })
    return yookassaProvider()
}

/**
 * Сверяет ожидающую покупку с провайдером и фиксирует результат.
 * Вызывается при возврате с оплаты, при открытии кабинета и из уведомления ЮKassa.
 */
export async function syncPurchase(purchase: typeof schema.purchases.$inferSelect) {
    if (purchase.status !== 'pending' || !purchase.paymentId) return purchase
    const { state, amount } = await paymentProvider(purchase.provider).fetch(purchase.paymentId)
    if (state === 'pending') return purchase
    if (state === 'succeeded' && amount !== null && amount !== purchase.amount) {
        console.error(`[payments] Сумма платежа ${purchase.paymentId} (${amount}) не совпадает с покупкой #${purchase.id} (${purchase.amount})`)
        return purchase
    }
    if (state === 'canceled') {
        const [updated] = await db.update(schema.purchases).set({ status: 'canceled' })
            .where(and(eq(schema.purchases.id, purchase.id), eq(schema.purchases.status, 'pending')))
            .returning()
        return updated ?? purchase
    }

    // Оплачено. Условие status = 'pending' — чтобы параллельные проверки не перетёрли друг друга.
    return await db.transaction(async (tx) => {
        const now = new Date()
        let period: { accessFrom: Date, accessUntil: Date } | null = null
        if (purchase.kind === 'subscription') {
            // Блокируем строку пользователя: два одновременных продления (даже самое первое)
            // посчитают период по очереди и не лягут на одни и те же даты.
            await tx.select({ id: schema.users.id }).from(schema.users)
                .where(eq(schema.users.id, purchase.userId)).for('update')
            const rows = await tx.select({ until: schema.purchases.accessUntil }).from(schema.purchases)
                .where(and(
                    eq(schema.purchases.userId, purchase.userId),
                    eq(schema.purchases.kind, 'subscription'),
                    eq(schema.purchases.status, 'succeeded'),
                    gt(schema.purchases.accessUntil, now),
                ))
            const lastUntil = rows.reduce<Date | null>((max, r) => (r.until && (!max || r.until > max) ? r.until : max), null)
            const accessFrom = lastUntil ?? now
            period = { accessFrom, accessUntil: addMonths(accessFrom, purchase.months ?? 1) }
        }
        const [updated] = await tx.update(schema.purchases)
            .set({ status: 'succeeded', paidAt: now, ...period })
            .where(and(eq(schema.purchases.id, purchase.id), eq(schema.purchases.status, 'pending')))
            .returning()
        return updated ?? purchase
    })
}

/** Дата + N месяцев (31 января + 1 месяц = последний день февраля). */
export function addMonths(date: Date, months: number) {
    const result = new Date(date)
    const day = result.getDate()
    result.setDate(1)
    result.setMonth(result.getMonth() + months)
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
    result.setDate(Math.min(day, lastDay))
    return result
}
