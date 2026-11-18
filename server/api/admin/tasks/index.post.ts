export default defineAdminHandler(async (event) => {
    const input = await readValidatedBody(event, validator(taskInputSchema))
    const id = await db.transaction(tx => saveTask(tx, input)).catch(err => rethrowDbError(err))
    setResponseStatus(event, 201)
    return loadAdminTask(id)
})
