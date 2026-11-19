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
 * Действующий короткий доступ (kind = 'pass'): до какого момента — с учётом уже оплаченных следующих
 * периодов — и лимит новых решений за сутки (null — без лимита). null — доступа сейчас нет.
 */
export async function activePass(userId: number) {
    const now = new Date()
    const rows = await db.select({
        from: schema.purchases.accessFrom,
        until: schema.purchases.accessUntil,
        dailyLimit: schema.purchases.dailyLimit,
    }).from(schema.purchases)
        .where(and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.kind, 'pass'),
            eq(schema.purchases.status, 'succeeded'),
            gt(schema.purchases.accessUntil, now),
        ))
    const current = rows.filter(r => r.from && r.from <= now)
    if (!current.length) return null
    const until = rows.reduce((max, r) => (r.until! > max ? r.until! : max), current[0]!.until!)
    const dailyLimit = current.some(r => r.dailyLimit === null)
        ? null
        : Math.max(...current.map(r => r.dailyLimit!))
    return { until, dailyLimit }
}

/**
 * Как открыть ответ и решение задачи:
 * - open — сразу (бесплатная задача, задача вне сборников, администратор, подписка, купленный сборник);
 * - pass — по короткому доступу: решение открывается по кнопке и засчитывается в лимит за сутки;
 * - locked — закрыто.
 */
export type SolutionAccess =
    | { kind: 'open' }
    | { kind: 'pass', userId: number, email: string, until: Date, dailyLimit: number | null }
    | { kind: 'locked' }

export async function solutionAccess(
    event: H3Event,
    memberships: { collectionId: number, isFree: boolean }[],
): Promise<SolutionAccess> {
    if (!memberships.length || memberships.some(m => m.isFree)) return { kind: 'open' }
    const { user } = await getUserSession(event)
    if (!user) return { kind: 'locked' }
    if (user.role === 'admin') return { kind: 'open' }
    if (await activeSubscription(user.id)) return { kind: 'open' }
    const paid = await paidCollectionIds(user.id, memberships.map(m => m.collectionId))
    if (paid.size > 0) return { kind: 'open' }
    const pass = await activePass(user.id)
    if (pass) return { kind: 'pass', userId: user.id, email: user.email, ...pass }
    return { kind: 'locked' }
}

/** Доступна ли задача вообще (в том числе по короткому доступу) — для «Реши сам». */
export async function canViewSolution(
    event: H3Event,
    memberships: { collectionId: number, isFree: boolean }[],
): Promise<boolean> {
    return (await solutionAccess(event, memberships)).kind !== 'locked'
}
