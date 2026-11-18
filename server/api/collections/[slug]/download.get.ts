import { and, asc, eq } from 'drizzle-orm'

/**
 * PDF сборника для того, у кого есть доступ: покупка этого сборника или действующая подписка.
 * Используется на странице сборника; в кабинете — /api/purchases/[id]/download.
 */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event)
    const slug = getRouterParam(event, 'slug')!
    const [collection] = await db.select({ id: schema.collections.id }).from(schema.collections)
        .where(eq(schema.collections.slug, slug)).limit(1)
    if (!collection) throw createError({ statusCode: 404, message: 'Сборник не найден' })

    const [purchase] = await db.select({ id: schema.purchases.id }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, user.id),
            eq(schema.purchases.kind, 'collection'),
            eq(schema.purchases.collectionId, collection.id),
            eq(schema.purchases.status, 'succeeded'),
        ))
        .orderBy(asc(schema.purchases.id))
        .limit(1)
    if (purchase) return sendCollectionPdf(event, collection.id, user, { id: purchase.id, label: 'заказ' })

    const subscription = await activeSubscription(user.id)
    if (subscription) return sendCollectionPdf(event, collection.id, user, { id: subscription.id, label: 'подписка' })

    throw createError({ statusCode: 403, message: 'Сборник не куплен' })
})
