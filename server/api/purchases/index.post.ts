import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
    collectionId: z.number().int().positive(),
    agree: z.literal(true, { message: 'Нужно согласие с условиями оферты' }),
})

/** Начать покупку: создаёт платёж и возвращает ссылку на оплату. */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event)
    const { collectionId } = await readValidatedBody(event, validator(bodySchema))

    const [collection] = await db.select().from(schema.collections)
        .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.status, 'published')))
        .limit(1)
    if (!collection) throw createError({ statusCode: 404, message: 'Сборник не найден' })
    if (!collection.price || collection.price <= 0) throw createError({ statusCode: 409, message: 'Сборник пока не продаётся' })

    const own = await db.select().from(schema.purchases)
        .where(and(eq(schema.purchases.userId, user.id), eq(schema.purchases.collectionId, collectionId)))
        .orderBy(desc(schema.purchases.createdAt))
    if (own.some(p => p.status === 'succeeded')) {
        throw createError({ statusCode: 409, message: 'Этот сборник у вас уже куплен' })
    }

    // Недавняя незавершённая оплата на ту же сумму — продолжаем её, а не плодим новые.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const p of own.filter(p => p.status === 'pending' && p.createdAt > hourAgo && p.amount === collection.price)) {
        const synced = await syncPurchase(p)
        if (synced.status === 'succeeded') throw createError({ statusCode: 409, message: 'Этот сборник у вас уже куплен' })
        if (synced.status === 'pending' && synced.confirmationUrl) {
            return { purchaseId: synced.id, confirmationUrl: synced.confirmationUrl }
        }
    }

    const provider = paymentProvider()
    const [purchase] = await db.insert(schema.purchases).values({
        userId: user.id,
        collectionId,
        amount: collection.price,
        provider: provider.name,
        collectionVersion: collection.version,
    }).returning()

    const { siteUrl } = useRuntimeConfig()
    try {
        const payment = await provider.create({
            purchaseId: purchase!.id,
            amount: collection.price,
            description: `Сборник «${collection.title}»`,
            returnUrl: `${siteUrl}/purchases/${purchase!.id}`,
            customerEmail: user.email,
        })
        await db.update(schema.purchases)
            .set({ paymentId: payment.paymentId, confirmationUrl: payment.confirmationUrl })
            .where(eq(schema.purchases.id, purchase!.id))
        return { purchaseId: purchase!.id, confirmationUrl: payment.confirmationUrl }
    } catch (err) {
        await db.update(schema.purchases).set({ status: 'canceled' }).where(eq(schema.purchases.id, purchase!.id))
        console.error('[payments] Не удалось создать платёж', err)
        throw createError({ statusCode: 502, message: 'Не удалось создать платёж. Попробуйте ещё раз чуть позже.' })
    }
})
