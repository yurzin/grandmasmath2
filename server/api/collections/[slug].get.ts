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

    if (!collection) throw createError({ statusCode: 404, statusMessage: 'Сборник не найден' })

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

    const { id: _id, ...rest } = collection
    return { ...rest, tasks }
})
