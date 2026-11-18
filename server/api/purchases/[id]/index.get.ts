/** Состояние покупки (страница возврата с оплаты); незавершённую сверяет с провайдером. */
export default defineEventHandler(async (event): Promise<PurchaseItem> => {
    const { purchase } = await requireOwnPurchase(event, getIdParam(event))
    const synced = await syncPurchase(purchase).catch((err) => {
        console.error('[payments] Не удалось проверить платёж', err)
        return purchase
    })
    return loadPurchaseItem(synced)
})
