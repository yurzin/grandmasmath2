import { and, desc, eq } from 'drizzle-orm'

type PurchaseRow = typeof schema.purchases.$inferSelect

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
        .leftJoin(schema.collections, eq(schema.purchases.collectionId, schema.collections.id))
        .where(eq(schema.purchases.userId, userId))
        .orderBy(desc(schema.purchases.createdAt))

    // Незавершённые оплаты сверяем с провайдером — на случай, если уведомление не дошло.
    const items = await Promise.all(rows.map(async (r) => {
        const purchase = r.purchase.status === 'pending' ? await syncPurchase(r.purchase).catch(() => r.purchase) : r.purchase
        return toPurchaseItem(purchase, r.slug && r.title ? { slug: r.slug, title: r.title } : null)
    }))
    // Брошенные неоплаченные попытки не показываем.
    return items.filter(p => p.status !== 'canceled')
}

export async function loadPurchaseItem(purchase: PurchaseRow) {
    if (!purchase.collectionId) return toPurchaseItem(purchase, null)
    const [collection] = await db.select({ slug: schema.collections.slug, title: schema.collections.title })
        .from(schema.collections).where(eq(schema.collections.id, purchase.collectionId))
    return toPurchaseItem(purchase, collection ?? null)
}

export function toPurchaseItem(p: PurchaseRow, collection: { slug: string, title: string } | null): PurchaseItem {
    return {
        id: p.id,
        kind: p.kind,
        status: p.status,
        amount: p.amount,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
        collection,
        months: p.months,
        days: p.days,
        dailyLimit: p.dailyLimit,
        accessFrom: p.accessFrom?.toISOString() ?? null,
        accessUntil: p.accessUntil?.toISOString() ?? null,
        confirmationUrl: p.status === 'pending' ? p.confirmationUrl : null,
    }
}

/**
 * Создаёт ожидающую покупку и платёж у провайдера. Если платёж создать не удалось,
 * покупка помечается отменённой.
 */
export async function startPayment(
    values: Omit<typeof schema.purchases.$inferInsert, 'provider' | 'status'>,
    description: string,
    customerEmail: string,
    /** Куда вернуть после оплаты (путь на сайте, например страница задачи). */
    next?: string,
) {
    const provider = paymentProvider()
    const [purchase] = await db.insert(schema.purchases).values({ ...values, provider: provider.name }).returning()
    const { siteUrl } = useRuntimeConfig()
    const returnPath = `/purchases/${purchase!.id}${next && isSafeNextPath(next) ? `?next=${encodeURIComponent(next)}` : ''}`
    try {
        const payment = await provider.create({
            purchaseId: purchase!.id,
            amount: values.amount,
            description,
            returnUrl: `${siteUrl}${returnPath}`,
            customerEmail,
        })
        await db.update(schema.purchases)
            .set({ paymentId: payment.paymentId, confirmationUrl: payment.confirmationUrl })
            .where(eq(schema.purchases.id, purchase!.id))
        return { purchaseId: purchase!.id, confirmationUrl: payment.confirmationUrl }
    } catch (err) {
        await db.update(schema.purchases).set({ status: 'canceled' }).where(eq(schema.purchases.id, purchase!.id))
        console.error('[payments] Не удалось создать платёж', err)
        throw createError({ statusCode: 502, message: 'Не удалось создать платёж. Попробуйте ещё раз чуть позже.' })
    }
}

/** Недавняя незавершённая оплата — продолжить её вместо новой. Возвращает её или «уже оплачено». */
export async function resumePendingPayment(candidates: PurchaseRow[], amount: number) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const p of candidates.filter(p => p.status === 'pending' && p.createdAt > hourAgo && p.amount === amount)) {
        const synced = await syncPurchase(p)
        if (synced.status === 'succeeded') return { paid: true as const }
        if (synced.status === 'pending' && synced.confirmationUrl) {
            return { paid: false as const, purchaseId: synced.id, confirmationUrl: synced.confirmationUrl }
        }
    }
    return null
}
