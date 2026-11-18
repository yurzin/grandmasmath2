import { asc, count, eq } from 'drizzle-orm'

export default defineAdminHandler(async (): Promise<AdminTopic[]> => {
    return await db
        .select({
            id: schema.topics.id,
            name: schema.topics.name,
            slug: schema.topics.slug,
            taskCount: count(schema.tasks.id),
        })
        .from(schema.topics)
        .leftJoin(schema.tasks, eq(schema.tasks.topicId, schema.topics.id))
        .groupBy(schema.topics.id)
        .orderBy(asc(schema.topics.name))
})
