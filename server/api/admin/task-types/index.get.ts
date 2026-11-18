import { asc, count, eq } from 'drizzle-orm'

export default defineAdminHandler(async (): Promise<AdminTaskType[]> => {
    return await db
        .select({
            id: schema.taskTypes.id,
            number: schema.taskTypes.number,
            examLevel: schema.taskTypes.examLevel,
            name: schema.taskTypes.name,
            taskCount: count(schema.tasks.id),
        })
        .from(schema.taskTypes)
        .leftJoin(schema.tasks, eq(schema.tasks.taskTypeId, schema.taskTypes.id))
        .groupBy(schema.taskTypes.id)
        .orderBy(asc(schema.taskTypes.examLevel), asc(schema.taskTypes.number))
})
