import { z } from 'zod'

const bodySchema = z.union([
    z.object({
        email: z.string().trim().toLowerCase().email(),
        code: z.string().trim().regex(/^\d{6}$/, 'Код — 6 цифр'),
    }),
    z.object({ token: z.string().min(20).max(100) }),
])

const perIp = createRateLimiter({ max: 30, windowMs: 15 * 60 * 1000 })

/** Шаг 2 входа покупателя: код из письма или токен из ссылки → сессия. */
export default defineEventHandler(async (event) => {
    const ip = clientIp(event)
    if (perIp.isLimited(ip)) {
        throw createError({ statusCode: 429, message: 'Слишком много попыток. Попробуйте позже.' })
    }

    const body = await readValidatedBody(event, validator(bodySchema))
    let email: string | null = null
    if ('token' in body) {
        email = await consumeLoginLink(body.token)
    } else if (await consumeLoginCode(body.email, body.code)) {
        email = body.email
    }

    if (!email) {
        perIp.hit(ip)
        throw createError({
            statusCode: 400,
            message: 'token' in body ? 'Ссылка устарела или уже использована. Запросите вход заново.' : 'Неверный или устаревший код',
        })
    }

    await signInByEmail(event, email)
    return { ok: true }
})
