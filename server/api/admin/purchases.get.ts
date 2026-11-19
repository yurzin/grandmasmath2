import { desc, eq } from 'drizzle-orm'

/** Последние покупки (сборники, подписка, короткий доступ) — для обзора продаж. */
export default defineAdminHandler(async (): Promise<AdminPurchase[]> => {
    const rows = await db
        .select({
            id: schema.purchases.id,
            kind: schema.purchases.kind,
            status: schema.purchases.status,
            amount: schema.purchases.amount,
            provider: schema.purchases.provider,
            months: schema.purchases.months,
            days: schema.purchases.days,
            accessUntil: schema.purchases.accessUntil,
            downloadCount: schema.purchases.downloadCount,
            createdAt: schema.purchases.createdAt,
            paidAt: schema.purchases.paidAt,
            email: schema.users.email,
            collectionTitle: schema.collections.title,
        })
        .from(schema.purchases)
        .innerJoin(schema.users, eq(schema.purchases.userId, schema.users.id))
        .leftJoin(schema.collections, eq(schema.purchases.collectionId, schema.collections.id))
        .orderBy(desc(schema.purchases.createdAt))
        .limit(200)
    return rows.map(r => ({
        ...r,
        accessUntil: r.accessUntil?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        paidAt: r.paidAt?.toISOString() ?? null,
    }))
})
