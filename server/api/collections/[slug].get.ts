import { and, asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event): Promise<CollectionDetail> => {
    const slug = getRouterParam(event, 'slug')!

    const [collection] = await db
        .select({
            id: schema.collections.id,
            slug: schema.collections.slug,
            title: schema.collections.title,
            description: schema.collections.description,
            price: schema.collections.price,
            coverUrl: schema.collections.coverUrl,
        })
        .from(schema.collections)
        .where(and(eq(schema.collections.slug, slug), eq(schema.collections.status, 'published')))
        .limit(1)

    if (!collection) throw createError({ statusCode: 404, message: 'Сборник не найден' })

    const tasks = await db
        .select({
            id: schema.tasks.id,
            position: schema.collectionTasks.position,
            title: schema.tasks.title,
            isFree: schema.collectionTasks.isFree,
        })
        .from(schema.collectionTasks)
        .innerJoin(schema.tasks, eq(schema.collectionTasks.taskId, schema.tasks.id))
        .where(eq(schema.collectionTasks.collectionId, collection.id))
        .orderBy(asc(schema.collectionTasks.position))

    // Для вошедшего: куплен ли сборник, есть ли подписка, какие задачи уже решены.
    const { user } = await getUserSession(event)
    if (!user) return { ...collection, tasks: tasks.map(t => ({ ...t, solved: false })), purchaseId: null, subscriptionUntil: null }

    const [[paid], subscription, solved] = await Promise.all([
        db.select({ id: schema.purchases.id }).from(schema.purchases)
            .where(and(
                eq(schema.purchases.userId, user.id),
                eq(schema.purchases.kind, 'collection'),
                eq(schema.purchases.collectionId, collection.id),
                eq(schema.purchases.status, 'succeeded'),
            ))
            .orderBy(asc(schema.purchases.id))
            .limit(1),
        activeSubscription(user.id),
        solvedTaskIds(user.id, tasks.map(t => t.id)),
    ])

    return {
        ...collection,
        tasks: tasks.map(t => ({ ...t, solved: solved.has(t.id) })),
        purchaseId: paid?.id ?? null,
        subscriptionUntil: subscription?.until.toISOString() ?? null,
    }
})
