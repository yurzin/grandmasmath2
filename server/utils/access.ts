import type { H3Event } from 'h3'
import { and, eq, inArray } from 'drizzle-orm'

/** id сборников, оплаченных пользователем. */
export async function paidCollectionIds(userId: number, among?: number[]) {
    if (among && !among.length) return new Set<number>()
    const rows = await db.select({ collectionId: schema.purchases.collectionId }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.status, 'succeeded'),
            among ? inArray(schema.purchases.collectionId, among) : undefined,
        ))
    return new Set(rows.map(r => r.collectionId))
}

/**
 * Можно ли показать ответ и решение задачи.
 * Открыто всем: задачи вне сборников и бесплатные задачи. Остальное — администратору
 * и тем, кто купил хотя бы один сборник с этой задачей.
 */
export async function canViewSolution(
    event: H3Event,
    memberships: { collectionId: number, isFree: boolean }[],
): Promise<boolean> {
    if (!memberships.length || memberships.some(m => m.isFree)) return true
    const { user } = await getUserSession(event)
    if (!user) return false
    if (user.role === 'admin') return true
    const paid = await paidCollectionIds(user.id, memberships.map(m => m.collectionId))
    return paid.size > 0
}
