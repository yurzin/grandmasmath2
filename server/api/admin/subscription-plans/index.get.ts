import { asc } from 'drizzle-orm'

export default defineAdminHandler(async (): Promise<AdminPlan[]> =>
    db.select().from(schema.subscriptionPlans).orderBy(asc(schema.subscriptionPlans.months)))
