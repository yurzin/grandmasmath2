/**
 * Простой ограничитель частоты в памяти процесса: не больше max событий за windowMs на ключ.
 * Переживает только до перезапуска сервера — для защиты от перебора этого достаточно.
 */
export function createRateLimiter({ max, windowMs }: { max: number, windowMs: number }) {
    const hits = new Map<string, { count: number, resetAt: number }>()

    function current(key: string, now: number) {
        const entry = hits.get(key)
        return entry && entry.resetAt > now ? entry : null
    }

    return {
        /** true, если лимит исчерпан. */
        isLimited(key: string) {
            return (current(key, Date.now())?.count ?? 0) >= max
        },
        hit(key: string) {
            const now = Date.now()
            const entry = current(key, now) ?? { count: 0, resetAt: now + windowMs }
            entry.count++
            hits.set(key, entry)
            if (hits.size > 10_000) {
                for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
            }
        },
        reset(key: string) {
            hits.delete(key)
        },
    }
}

export function clientIp(event: Parameters<typeof getRequestIP>[0]) {
    return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}
