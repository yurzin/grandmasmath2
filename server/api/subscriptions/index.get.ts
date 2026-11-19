import { asc, eq } from 'drizzle-orm'

/** Тарифы (подписка и короткий доступ) и что из этого действует у текущего пользователя. */
export default defineEventHandler(async (event): Promise<SubscriptionInfo> => {
    const active = await db.select().from(schema.subscriptionPlans)
        .where(eq(schema.subscriptionPlans.active, true))
        .orderBy(asc(schema.subscriptionPlans.months), asc(schema.subscriptionPlans.days))
    const plans = active.filter(p => p.months !== null).map(p => ({ id: p.id, months: p.months!, price: p.price }))
    const passes = active.filter(p => p.days !== null).map(p => ({ id: p.id, days: p.days!, dailyLimit: p.dailyLimit, price: p.price }))

    const { user } = await getUserSession(event)
    const [subscription, pass] = user ? await Promise.all([activeSubscription(user.id), activePass(user.id)]) : [null, null]
    return {
        plans,
        passes,
        activeUntil: subscription?.until.toISOString() ?? null,
        passUntil: pass?.until.toISOString() ?? null,
    }
})

