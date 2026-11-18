export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const input = await readValidatedBody(event, validator(taskInputSchema))
    await db.transaction(tx => saveTask(tx, input, id)).catch(err => rethrowDbError(err))
    return loadAdminTask(id)
})
