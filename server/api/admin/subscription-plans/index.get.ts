import { asc, sql } from 'drizzle-orm'

/** Тарифы: сначала короткий доступ (по дням), затем подписка (по месяцам). */
export default defineAdminHandler(async (): Promise<AdminPlan[]> =>
    db.select().from(schema.subscriptionPlans)
        .orderBy(sql`${schema.subscriptionPlans.months} IS NOT NULL`, asc(schema.subscriptionPlans.days), asc(schema.subscriptionPlans.months)))
