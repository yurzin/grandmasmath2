import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

const bodySchema = z.object({
    planId: z.number().int().positive(),
    agree: z.literal(true, { message: 'Нужно согласие с условиями оферты' }),
    /** Куда вернуть после оплаты (например, на задачу, с которой пришли). */
    next: z.string().max(300).optional(),
})

/** Оформить или продлить подписку либо купить короткий доступ: платёж за выбранный тариф. */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event)
    const { planId, next } = await readValidatedBody(event, validator(bodySchema))

    const [plan] = await db.select().from(schema.subscriptionPlans)
        .where(and(eq(schema.subscriptionPlans.id, planId), eq(schema.subscriptionPlans.active, true)))
        .limit(1)
    if (!plan) throw createError({ statusCode: 404, message: 'Тариф не найден' })

    const isPass = plan.days !== null
    // При действующей подписке короткий доступ ничего не добавит — не берём деньги зря.
    if (isPass && await activeSubscription(user.id)) {
        throw createError({ statusCode: 409, message: 'У вас действует подписка — все решения уже открыты' })
    }

    const kind = isPass ? 'pass' as const : 'subscription' as const
    // Продолжаем недавнюю незавершённую оплату того же тарифа, а не создаём новую.
    const pending = await db.select().from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, user.id),
            eq(schema.purchases.kind, kind),
            isPass ? eq(schema.purchases.days, plan.days!) : eq(schema.purchases.months, plan.months!),
            eq(schema.purchases.status, 'pending'),
        ))
        .orderBy(desc(schema.purchases.createdAt))
    const resumed = await resumePendingPayment(pending, plan.price)
    if (resumed && !resumed.paid) return { purchaseId: resumed.purchaseId, confirmationUrl: resumed.confirmationUrl }

    if (isPass) {
        return startPayment(
            { userId: user.id, kind, days: plan.days, dailyLimit: plan.dailyLimit, amount: plan.price },
            `Доступ ко всем решениям на сайте: ${plural(plan.days!, ['день', 'дня', 'дней'])}`,
            user.email,
            next,
        )
    }
    return startPayment(
        { userId: user.id, kind, months: plan.months, amount: plan.price },
        `Подписка на все сборники: ${plural(plan.months!, ['месяц', 'месяца', 'месяцев'])}`,
        user.email,
        next,
    )
})
