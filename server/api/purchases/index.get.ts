/** Мои покупки. */
export default defineEventHandler(async (event): Promise<PurchaseItem[]> => {
    const { user } = await requireUserSession(event)
    return listPurchases(user.id)
})
