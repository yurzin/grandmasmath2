const DUPLICATE = 'Такой номер ЕГЭ для этого уровня уже есть'

export default defineAdminHandler(async (event): Promise<AdminTaskType> => {
    const input = await readValidatedBody(event, validator(taskTypeInputSchema))
    const [taskType] = await db.insert(schema.taskTypes).values(input).returning()
        .catch(err => rethrowDbError(err, DUPLICATE))
    setResponseStatus(event, 201)
    return { ...taskType!, taskCount: 0 }
})
