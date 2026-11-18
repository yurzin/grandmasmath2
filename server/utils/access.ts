import type { H3Event } from 'h3'
import { and, desc, eq, gt, inArray, lte } from 'drizzle-orm'

/** id сборников, оплаченных пользователем. */
export async function paidCollectionIds(userId: number, among?: number[]) {
    if (among && !among.length) return new Set<number>()
    const rows = await db.select({ collectionId: schema.purchases.collectionId }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.kind, 'collection'),
            eq(schema.purchases.status, 'succeeded'),
            among ? inArray(schema.purchases.collectionId, among) : undefined,
        ))
    return new Set(rows.flatMap(r => (r.collectionId ? [r.collectionId] : [])))
}

/** Действующая подписка пользователя: id и дата окончания (с учётом продлений), иначе null. */
export async function activeSubscription(userId: number) {
    const now = new Date()
    const [current] = await db.select({ id: schema.purchases.id }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.kind, 'subscription'),
            eq(schema.purchases.status, 'succeeded'),
            lte(schema.purchases.accessFrom, now),
            gt(schema.purchases.accessUntil, now),
        ))
        .limit(1)
    if (!current) return null
    // Продления идут подряд — доступ до конца последнего оплаченного периода.
    const [last] = await db.select({ until: schema.purchases.accessUntil }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.kind, 'subscription'),
            eq(schema.purchases.status, 'succeeded'),
        ))
        .orderBy(desc(schema.purchases.accessUntil))
        .limit(1)
    return { id: current.id, until: last!.until! }
}

/**
 * Можно ли показать ответ и решение задачи.
 * Открыто всем: задачи вне сборников и бесплатные задачи. Остальное — администратору,
 * подписчикам и тем, кто купил хотя бы один сборник с этой задачей.
 */
export async function canViewSolution(
    event: H3Event,
    memberships: { collectionId: number, isFree: boolean }[],
): Promise<boolean> {
    if (!memberships.length || memberships.some(m => m.isFree)) return true
    const { user } = await getUserSession(event)
    if (!user) return false
    if (user.role === 'admin') return true
    if (await activeSubscription(user.id)) return true
    const paid = await paidCollectionIds(user.id, memberships.map(m => m.collectionId))
    return paid.size > 0
}
