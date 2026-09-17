import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
    return await db
        .select({
            id: schema.taskTypes.id,
            number: schema.taskTypes.number,
            examLevel: schema.taskTypes.examLevel,
            name: schema.taskTypes.name,
        })
        .from(schema.taskTypes)
        .orderBy(asc(schema.taskTypes.examLevel), asc(schema.taskTypes.number))
})
