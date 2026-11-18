import { z } from 'zod'

const bodySchema = z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    /** Куда вернуть после входа по ссылке из письма (только внутренний путь). */
    redirect: z.string().max(500).optional(),
})

const perIp = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 })

/** Шаг 1 входа покупателя: письмо с 6-значным кодом и ссылкой. */
export default defineEventHandler(async (event) => {
    const ip = clientIp(event)
    if (perIp.isLimited(ip)) {
        throw createError({ statusCode: 429, message: 'Слишком много запросов. Попробуйте позже.' })
    }
    perIp.hit(ip)

    const { email, redirect } = await readValidatedBody(event, validator(bodySchema))
    const { code, link } = await issueLoginCode(email)

    const { siteUrl } = useRuntimeConfig()
    const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/account'
    const url = `${siteUrl}/auth/verify?token=${link}&redirect=${encodeURIComponent(safeRedirect)}`

    await sendMail({
        to: email,
        subject: `Код для входа: ${code}`,
        text: [
            `Ваш код для входа: ${code}`,
            '',
            `Или откройте ссылку: ${url}`,
            '',
            'Код и ссылка действуют 15 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.',
        ].join('\n'),
        html: `<p>Ваш код для входа:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>
<p>Или <a href="${url}">войдите по ссылке</a>.</p>
<p style="color:#777">Код и ссылка действуют 15 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.</p>`,
    })
    return { ok: true }
})
