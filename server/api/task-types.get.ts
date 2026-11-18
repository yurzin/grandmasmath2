import { asc, count, eq } from 'drizzle-orm'

/** Номера заданий ЕГЭ. ?used=1 — только те, по которым на сайте есть задачи (для фильтра), с их числом. */
export default defineEventHandler(async (event) => {
    const used = Boolean(getQuery(event).used)
    const rows = await db
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
    return used ? rows.filter(r => r.taskCount > 0) : rows
})
