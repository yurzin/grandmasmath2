import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
    collectionId: z.number().int().positive(),
    agree: z.literal(true, { message: 'Нужно согласие с условиями оферты' }),
})

/** Начать покупку сборника: создаёт платёж и возвращает ссылку на оплату. */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event)
    const { collectionId } = await readValidatedBody(event, validator(bodySchema))

    const [collection] = await db.select().from(schema.collections)
        .where(and(eq(schema.collections.id, collectionId), eq(schema.collections.status, 'published')))
        .limit(1)
    if (!collection) throw createError({ statusCode: 404, message: 'Сборник не найден' })
    if (!collection.price || collection.price <= 0) throw createError({ statusCode: 409, message: 'Сборник пока не продаётся' })

    const own = await db.select().from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, user.id),
            eq(schema.purchases.kind, 'collection'),
            eq(schema.purchases.collectionId, collectionId),
        ))
        .orderBy(desc(schema.purchases.createdAt))
    const alreadyPaid = () => createError({ statusCode: 409, message: 'Этот сборник у вас уже куплен' })
    if (own.some(p => p.status === 'succeeded')) throw alreadyPaid()

    const resumed = await resumePendingPayment(own, collection.price)
    if (resumed?.paid) throw alreadyPaid()
    if (resumed) return { purchaseId: resumed.purchaseId, confirmationUrl: resumed.confirmationUrl }

    return startPayment(
        { userId: user.id, kind: 'collection', collectionId, amount: collection.price, collectionVersion: collection.version },
        `Сборник «${collection.title}»`,
        user.email,
    )
})
