export default defineAdminHandler(async (event) => {
    const input = await readValidatedBody(event, validator(collectionInputSchema))
    const id = await db.transaction(tx => saveCollection(tx, input))
        .catch(err => rethrowDbError(err, 'Сборник с таким адресом (slug) уже есть'))
    setResponseStatus(event, 201)
    return loadAdminCollection(id)
})
