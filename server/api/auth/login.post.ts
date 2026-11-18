import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../../lib/password'

const bodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(200),
})

// Не больше MAX_ATTEMPTS неудачных попыток с одного IP за WINDOW_MS.
const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number, resetAt: number }>()

// Хеш-пустышка: проверяем пароль и для несуществующего email, чтобы время ответа не выдавало, есть ли пользователь.
const dummyHash = hashPassword('dummy-password-for-timing')

export default defineEventHandler(async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
    const now = Date.now()
    const entry = failures.get(ip)
    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
        throw createError({ statusCode: 429, message: 'Слишком много попыток. Попробуйте позже.' })
    }

    const { email, password } = await readValidatedBody(event, validator(bodySchema))

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
    const ok = await verifyPassword(user?.password ?? await dummyHash, password)

    if (!user?.password || !ok) {
        const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS }
        current.count++
        failures.set(ip, current)
        if (failures.size > 10_000) {
            for (const [key, value] of failures) if (value.resetAt <= now) failures.delete(key)
        }
        throw createError({ statusCode: 401, message: 'Неверный email или пароль' })
    }

    failures.delete(ip)
    await setUserSession(event, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        loggedInAt: new Date().toISOString(),
    })
    return { ok: true }
})
