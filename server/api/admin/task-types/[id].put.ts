import { eq } from 'drizzle-orm'

export default defineAdminHandler(async (event): Promise<AdminTaskType> => {
    const id = getIdParam(event)
    const input = await readValidatedBody(event, validator(taskTypeInputSchema))
    const [taskType] = await db.update(schema.taskTypes).set(input).where(eq(schema.taskTypes.id, id)).returning()
        .catch(err => rethrowDbError(err, 'Такой номер ЕГЭ для этого уровня уже есть'))
    if (!taskType) throw createError({ statusCode: 404, message: 'Номер ЕГЭ не найден' })
    return { ...taskType, taskCount: await countTasksBy('taskTypeId', id) }
})
