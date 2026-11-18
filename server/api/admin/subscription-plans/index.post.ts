export default defineAdminHandler(async (event): Promise<AdminPlan> => {
    const input = await readValidatedBody(event, validator(planInputSchema))
    const [plan] = await db.insert(schema.subscriptionPlans).values(input).returning()
        .catch(err => rethrowDbError(err, 'Тариф на такой срок уже есть'))
    setResponseStatus(event, 201)
    return plan!
})
