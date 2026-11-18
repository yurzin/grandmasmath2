import { asc, count, eq } from 'drizzle-orm'

export default defineEventHandler(async (): Promise<CollectionCard[]> => {
    return await db
        .select({
            slug: schema.collections.slug,
            title: schema.collections.title,
            description: schema.collections.description,
            price: schema.collections.price,
            coverUrl: schema.collections.coverUrl,
            taskCount: count(schema.collectionTasks.taskId),
        })
        .from(schema.collections)
        .leftJoin(schema.collectionTasks, eq(schema.collectionTasks.collectionId, schema.collections.id))
        .where(eq(schema.collections.status, 'published'))
        .groupBy(schema.collections.id)
        .orderBy(asc(schema.collections.title))
})
