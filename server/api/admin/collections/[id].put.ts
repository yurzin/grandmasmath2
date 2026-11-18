export default defineAdminHandler(async (event) => {
    const id = getIdParam(event)
    const input = await readValidatedBody(event, validator(collectionInputSchema))
    await db.transaction(tx => saveCollection(tx, input, id))
        .catch(err => rethrowDbError(err, 'Сборник с таким адресом (slug) уже есть'))
    return loadAdminCollection(id)
})
