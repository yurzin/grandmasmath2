import { asc, eq } from 'drizzle-orm'

/** Тарифы подписки и состояние подписки текущего пользователя. */
export default defineEventHandler(async (event): Promise<SubscriptionInfo> => {
    const plans = await db.select({ id: schema.subscriptionPlans.id, months: schema.subscriptionPlans.months, price: schema.subscriptionPlans.price })
        .from(schema.subscriptionPlans)
        .where(eq(schema.subscriptionPlans.active, true))
        .orderBy(asc(schema.subscriptionPlans.months))
    const { user } = await getUserSession(event)
    const active = user ? await activeSubscription(user.id) : null
    return { plans, activeUntil: active?.until.toISOString() ?? null }
})
