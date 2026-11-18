import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'

export const LOGIN_CODE_TTL_MS = 15 * 60 * 1000
export const LOGIN_CODE_MAX_ATTEMPTS = 5
/** Не больше стольких писем на один адрес за время жизни кода. */
export const LOGIN_CODES_PER_EMAIL = 3

/** HMAC с секретом сессий: утечка таблицы не позволит перебрать коды офлайн. */
function hmac(value: string) {
    const secret = useRuntimeConfig().session.password
    return createHmac('sha256', secret).update(value).digest('hex')
}

function safeEqual(a: string, b: string) {
    const x = Buffer.from(a)
    const y = Buffer.from(b)
    return x.length === y.length && timingSafeEqual(x, y)
}

export async function issueLoginCode(email: string) {
    const recent = await db.select({ n: sql<number>`count(*)::int` }).from(schema.loginTokens)
        .where(and(eq(schema.loginTokens.email, email), gt(schema.loginTokens.createdAt, new Date(Date.now() - LOGIN_CODE_TTL_MS))))
    if ((recent[0]?.n ?? 0) >= LOGIN_CODES_PER_EMAIL) {
        throw createError({ statusCode: 429, message: 'Письмо уже отправлено несколько раз. Проверьте почту или попробуйте через 15 минут.' })
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const link = randomBytes(32).toString('base64url')
    await db.insert(schema.loginTokens).values({
        email,
        codeHash: hmac(`${email}:${code}`),
        linkHash: hmac(link),
        expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
    })
    return { code, link }
}

/** Проверяет код для email. Возвращает true и гасит код при успехе. */
export async function consumeLoginCode(email: string, code: string) {
    const [token] = await db.select().from(schema.loginTokens)
        .where(and(
            eq(schema.loginTokens.email, email),
            isNull(schema.loginTokens.usedAt),
            gt(schema.loginTokens.expiresAt, new Date()),
        ))
        .orderBy(desc(schema.loginTokens.id))
        .limit(1)
    if (!token) return false
    if (token.attempts >= LOGIN_CODE_MAX_ATTEMPTS) {
        throw createError({ statusCode: 429, message: 'Слишком много неверных попыток. Запросите новый код.' })
    }
    if (!safeEqual(token.codeHash, hmac(`${email}:${code}`))) {
        await db.update(schema.loginTokens).set({ attempts: sql`${schema.loginTokens.attempts} + 1` })
            .where(eq(schema.loginTokens.id, token.id))
        return false
    }
    return markUsed(token.id)
}

/** Проверяет ссылку из письма. Возвращает email или null. */
export async function consumeLoginLink(link: string) {
    const [token] = await db.select().from(schema.loginTokens)
        .where(and(
            eq(schema.loginTokens.linkHash, hmac(link)),
            isNull(schema.loginTokens.usedAt),
            gt(schema.loginTokens.expiresAt, new Date()),
        ))
        .limit(1)
    if (!token) return null
    return (await markUsed(token.id)) ? token.email : null
}

/** Гасит код атомарно: из двух одновременных запросов пройдёт только один. */
async function markUsed(id: number) {
    const updated = await db.update(schema.loginTokens).set({ usedAt: new Date() })
        .where(and(eq(schema.loginTokens.id, id), isNull(schema.loginTokens.usedAt)))
        .returning({ id: schema.loginTokens.id })
    return updated.length > 0
}

/**
 * Находит или создаёт покупателя и открывает сессию.
 * Роль в сессии — всегда 'user': админка доступна только после входа по паролю.
 */
export async function signInByEmail(event: Parameters<typeof setUserSession>[0], email: string) {
    const [user] = await db.insert(schema.users)
        .values({ email, name: email.split('@')[0]! })
        .onConflictDoUpdate({ target: schema.users.email, set: { email } })
        .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    await setUserSession(event, {
        user: { id: user!.id, name: user!.name, email: user!.email, role: 'user' },
        loggedInAt: new Date().toISOString(),
    })
}
