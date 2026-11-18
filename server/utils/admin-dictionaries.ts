import { count, eq } from 'drizzle-orm'

/** Сколько задач ссылается на тему / номер ЕГЭ — удалять можно только неиспользуемые. */
export async function countTasksBy(column: 'topicId' | 'taskTypeId', id: number) {
    const [row] = await db.select({ n: count() }).from(schema.tasks).where(eq(schema.tasks[column], id))
    return row?.n ?? 0
}

export function assertUnused(taskCount: number, what: string) {
    if (taskCount > 0) {
        throw createError({
            statusCode: 409,
            message: `${what} используется в ${plural(taskCount, ['задаче', 'задачах', 'задачах'])}, удалить нельзя`,
        })
    }
}
