import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
    planId: z.number().int().positive(),
    agree: z.literal(true, { message: 'Нужно согласие с условиями оферты' }),
})

/** Оформить или продлить подписку: платёж за выбранный срок. */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event)
    const { planId } = await readValidatedBody(event, validator(bodySchema))

    const [plan] = await db.select().from(schema.subscriptionPlans)
        .where(and(eq(schema.subscriptionPlans.id, planId), eq(schema.subscriptionPlans.active, true)))
        .limit(1)
    if (!plan) throw createError({ statusCode: 404, message: 'Тариф не найден' })

    // Продолжаем недавнюю незавершённую оплату того же срока, а не создаём новую.
    const pending = await db.select().from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, user.id),
            eq(schema.purchases.kind, 'subscription'),
            eq(schema.purchases.months, plan.months),
            eq(schema.purchases.status, 'pending'),
        ))
        .orderBy(desc(schema.purchases.createdAt))
    const resumed = await resumePendingPayment(pending, plan.price)
    if (resumed && !resumed.paid) return { purchaseId: resumed.purchaseId, confirmationUrl: resumed.confirmationUrl }

    return startPayment(
        { userId: user.id, kind: 'subscription', months: plan.months, amount: plan.price },
        `Подписка на все сборники: ${plural(plan.months, ['месяц', 'месяца', 'месяцев'])}`,
        user.email,
    )
})
