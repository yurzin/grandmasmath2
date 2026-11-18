import { count, isNotNull } from 'drizzle-orm'

/** Сколько задач ждут проверки автором — для значка в меню админки. */
export default defineAdminHandler(async () => {
    const [row] = await db.select({ count: count() }).from(schema.tasks).where(isNotNull(schema.tasks.reviewNote))
    return { count: row?.count ?? 0 }
})
