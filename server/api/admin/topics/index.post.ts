export default defineAdminHandler(async (event): Promise<AdminTopic> => {
    const input = await readValidatedBody(event, validator(topicInputSchema))
    const [topic] = await db.insert(schema.topics).values(input).returning()
        .catch(err => rethrowDbError(err, 'Тема с таким адресом (slug) уже есть'))
    setResponseStatus(event, 201)
    return { ...topic!, taskCount: 0 }
})
