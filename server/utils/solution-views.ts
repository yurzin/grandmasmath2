import { and, asc, count, countDistinct, eq, gt } from 'drizzle-orm'

/**
 * Короткий доступ: учёт открытых решений.
 * - Лимит считается по разным задачам за скользящие 24 часа; повторно открыть ту же задачу в эти сутки можно бесплатно.
 * - Защита от выкачивания: не больше BURST_MAX новых решений за минуту.
 */
const DAY_MS = 24 * 60 * 60 * 1000
const BURST_WINDOW_MS = 60 * 1000
const BURST_MAX = 6

export interface PassQuota {
    used: number
    limit: number | null
}

/** Сколько разных решений пользователь открыл за последние сутки. */
export async function passQuota(userId: number, dailyLimit: number | null): Promise<PassQuota> {
    const since = new Date(Date.now() - DAY_MS)
    const [row] = await db.select({ n: countDistinct(schema.solutionViews.taskId) }).from(schema.solutionViews)
        .where(and(eq(schema.solutionViews.userId, userId), gt(schema.solutionViews.viewedAt, since)))
    return { used: row?.n ?? 0, limit: dailyLimit }
}

/** Открывал ли пользователь это решение за последние сутки (тогда оно открыто без списания). */
export async function viewedRecently(userId: number, taskId: number) {
    const since = new Date(Date.now() - DAY_MS)
    const [row] = await db.select({ id: schema.solutionViews.id }).from(schema.solutionViews)
        .where(and(
            eq(schema.solutionViews.userId, userId),
            eq(schema.solutionViews.taskId, taskId),
            gt(schema.solutionViews.viewedAt, since),
        ))
        .limit(1)
    return Boolean(row)
}

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

/**
 * Засчитать открытие решения. Бросает 429, если исчерпан лимит за сутки или решения открываются слишком часто.
 * Строка пользователя блокируется — параллельные запросы считаются по очереди и не проскакивают лимит.
 */
export async function registerSolutionView(userId: number, taskId: number, dailyLimit: number | null): Promise<PassQuota> {
    return db.transaction(async (tx) => {
        await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId)).for('update')

        const now = Date.now()
        const daySince = new Date(now - DAY_MS)
        const recent = await tx.select({ taskId: schema.solutionViews.taskId, viewedAt: schema.solutionViews.viewedAt })
            .from(schema.solutionViews)
            .where(and(eq(schema.solutionViews.userId, userId), gt(schema.solutionViews.viewedAt, daySince)))
            .orderBy(asc(schema.solutionViews.viewedAt))

        const opened = new Set(recent.map(r => r.taskId))
        if (opened.has(taskId)) return { used: opened.size, limit: dailyLimit }

        if (dailyLimit !== null && opened.size >= dailyLimit) {
            // Место освободится, когда самое раннее из открытых за сутки решений выйдет из окна.
            const firstSeen = new Map<number, Date>()
            for (const r of recent) if (!firstSeen.has(r.taskId)) firstSeen.set(r.taskId, r.viewedAt)
            const earliest = Math.min(...[...firstSeen.values()].map(d => d.getTime()))
            throw createError({
                statusCode: 429,
                message: `За сутки открыто ${plural(dailyLimit, ['решение', 'решения', 'решений'])} — это лимит короткого доступа. `
                    + `Следующее решение можно будет открыть в ${timeFormat.format(new Date(earliest + DAY_MS))} (МСК). `
                    + 'Уже открытые решения доступны без ограничений.',
            })
        }

        const [burst] = await tx.select({ n: count() }).from(schema.solutionViews)
            .where(and(eq(schema.solutionViews.userId, userId), gt(schema.solutionViews.viewedAt, new Date(now - BURST_WINDOW_MS))))
        if ((burst?.n ?? 0) >= BURST_MAX) {
            throw createError({ statusCode: 429, message: 'Решения открываются слишком быстро. Подождите минуту.' })
        }

        await tx.insert(schema.solutionViews).values({ userId, taskId })
        return { used: opened.size + 1, limit: dailyLimit }
    })
}
