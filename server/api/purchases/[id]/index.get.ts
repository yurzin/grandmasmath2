import { eq } from 'drizzle-orm'

/** Состояние покупки (страница возврата с оплаты); незавершённую сверяет с провайдером. */
export default defineEventHandler(async (event): Promise<PurchaseItem> => {
    const { purchase } = await requireOwnPurchase(event, getIdParam(event))
    const synced = await syncPurchase(purchase).catch((err) => {
        console.error('[payments] Не удалось проверить платёж', err)
        return purchase
    })
    const [collection] = await db.select({ slug: schema.collections.slug, title: schema.collections.title })
        .from(schema.collections).where(eq(schema.collections.id, synced.collectionId))
    return toPurchaseItem(synced, collection!)
})
