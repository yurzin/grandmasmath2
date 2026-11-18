import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../../lib/password'

const bodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(200),
})

// Не больше 10 неудачных попыток с одного IP за 15 минут.
const failures = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

// Хеш-пустышка: проверяем пароль и для несуществующего email, чтобы время ответа не выдавало, есть ли пользователь.
const dummyHash = hashPassword('dummy-password-for-timing')

/** Вход администратора по паролю. Покупатели входят по коду из письма (/api/auth/email/*). */
export default defineEventHandler(async (event) => {
    const ip = clientIp(event)
    if (failures.isLimited(ip)) {
        throw createError({ statusCode: 429, message: 'Слишком много попыток. Попробуйте позже.' })
    }

    const { email, password } = await readValidatedBody(event, validator(bodySchema))

    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
    const ok = await verifyPassword(user?.password ?? await dummyHash, password)

    if (!user?.password || !ok) {
        failures.hit(ip)
        throw createError({ statusCode: 401, message: 'Неверный email или пароль' })
    }

    failures.reset(ip)
    await setUserSession(event, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        loggedInAt: new Date().toISOString(),
    })
    return { ok: true }
})
