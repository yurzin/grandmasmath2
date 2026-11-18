import { and, desc, eq } from 'drizzle-orm'

/** Покупка текущего пользователя; 404 для чужих и несуществующих. */
export async function requireOwnPurchase(event: Parameters<typeof requireUserSession>[0], id: number) {
    const { user } = await requireUserSession(event)
    const [purchase] = await db.select().from(schema.purchases)
        .where(and(eq(schema.purchases.id, id), eq(schema.purchases.userId, user.id)))
        .limit(1)
    if (!purchase) throw createError({ statusCode: 404, message: 'Покупка не найдена' })
    return { user, purchase }
}

export async function listPurchases(userId: number): Promise<PurchaseItem[]> {
    const rows = await db
        .select({
            purchase: schema.purchases,
            slug: schema.collections.slug,
            title: schema.collections.title,
        })
        .from(schema.purchases)
        .innerJoin(schema.collections, eq(schema.purchases.collectionId, schema.collections.id))
        .where(eq(schema.purchases.userId, userId))
        .orderBy(desc(schema.purchases.createdAt))

    // Незавершённые оплаты сверяем с провайдером — на случай, если уведомление не дошло.
    const items = await Promise.all(rows.map(async (r) => {
        const purchase = r.purchase.status === 'pending' ? await syncPurchase(r.purchase).catch(() => r.purchase) : r.purchase
        return toPurchaseItem(purchase, { slug: r.slug, title: r.title })
    }))
    // Брошенные неоплаченные попытки не показываем.
    return items.filter(p => p.status !== 'canceled')
}

export function toPurchaseItem(p: typeof schema.purchases.$inferSelect, collection: { slug: string, title: string }): PurchaseItem {
    return {
        id: p.id,
        status: p.status,
        amount: p.amount,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
        collection,
        confirmationUrl: p.status === 'pending' ? p.confirmationUrl : null,
    }
}
