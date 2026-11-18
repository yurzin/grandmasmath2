/** PDF купленного сборника с персональным водяным знаком. */
export default defineEventHandler(async (event) => {
    const { user, purchase } = await requireOwnPurchase(event, getIdParam(event))
    if (purchase.status !== 'succeeded') throw createError({ statusCode: 403, message: 'Покупка не оплачена' })
    if (purchase.kind !== 'collection' || !purchase.collectionId) {
        throw createError({ statusCode: 400, message: 'Это не покупка сборника' })
    }
    return sendCollectionPdf(event, purchase.collectionId, user, { id: purchase.id, label: 'заказ' })
})
