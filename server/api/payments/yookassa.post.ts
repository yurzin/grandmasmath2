import { eq } from 'drizzle-orm'

/**
 * Уведомления ЮKassa (payment.succeeded / payment.canceled).
 * Уведомления не подписаны, поэтому содержимому не доверяем: берём из него только id
 * платежа и запрашиваем актуальный статус у ЮKassa сами (syncPurchase).
 * Адрес указать в ЛК ЮKassa: https://<сайт>/api/payments/yookassa
 */
export default defineEventHandler(async (event) => {
    const body = await readBody<{ object?: { id?: unknown } }>(event).catch(() => null)
    const paymentId = typeof body?.object?.id === 'string' ? body.object.id : null
    if (!paymentId || paymentId.length > 100) return { ok: true }

    const [purchase] = await db.select().from(schema.purchases)
        .where(eq(schema.purchases.paymentId, paymentId)).limit(1)
    if (purchase) {
        try {
            await syncPurchase(purchase)
        } catch (err) {
            // Ответ не 200 — ЮKassa повторит уведомление позже.
            console.error('[payments] Не удалось обработать уведомление', err)
            throw createError({ statusCode: 500 })
        }
    }
    return { ok: true }
})
