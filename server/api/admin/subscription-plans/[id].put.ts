import { eq } from 'drizzle-orm'

// Цена меняется только для новых оплат: уже оплаченные периоды не трогаются.
export default defineAdminHandler(async (event): Promise<AdminPlan> => {
    const id = getIdParam(event)
    const input = await readValidatedBody(event, validator(planInputSchema))
    const [plan] = await db.update(schema.subscriptionPlans).set(input)
        .where(eq(schema.subscriptionPlans.id, id)).returning()
        .catch(err => rethrowDbError(err, 'Тариф на такой срок уже есть'))
    if (!plan) throw createError({ statusCode: 404, message: 'Тариф не найден' })
    return plan
})
