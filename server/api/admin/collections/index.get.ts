import { asc, count, eq } from 'drizzle-orm'

export default defineAdminHandler(async (): Promise<AdminCollectionListItem[]> => {
    const rows = await db
        .select({
            id: schema.collections.id,
            slug: schema.collections.slug,
            title: schema.collections.title,
            status: schema.collections.status,
            price: schema.collections.price,
            version: schema.collections.version,
            updatedAt: schema.collections.updatedAt,
            taskCount: count(schema.collectionTasks.taskId),
        })
        .from(schema.collections)
        .leftJoin(schema.collectionTasks, eq(schema.collectionTasks.collectionId, schema.collections.id))
        .groupBy(schema.collections.id)
        .orderBy(asc(schema.collections.title))
    return rows.map(r => ({ ...r, updatedAt: r.updatedAt.toISOString() }))
})
