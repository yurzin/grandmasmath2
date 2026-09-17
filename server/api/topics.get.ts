import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
    return await db
        .select({
            id: schema.topics.id,
            name: schema.topics.name,
            slug: schema.topics.slug,
        })
        .from(schema.topics)
        .orderBy(asc(schema.topics.name))
})
