// Хеширование паролей scrypt (node:crypto). Лежит вне server/utils, чтобы
// не пересекаться с автоимпортами nuxt-auth-utils и работать в CLI-скриптах.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const PARAMS = { N: 16384, r: 8, p: 1 }
const KEY_LENGTH = 64

function derive(password: string, salt: Buffer, options: ScryptOptions) {
    return new Promise<Buffer>((resolve, reject) => {
        scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key)))
    })
}

/** Формат: scrypt$N$r$p$соль(base64)$хеш(base64) */
export async function hashPassword(password: string) {
    const salt = randomBytes(16)
    const key = await derive(password, salt, PARAMS)
    return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(stored: string, password: string) {
    const [algo, N, r, p, salt, hash] = stored.split('$')
    if (algo !== 'scrypt' || !salt || !hash) return false
    const expected = Buffer.from(hash, 'base64')
    const key = await derive(password, Buffer.from(salt, 'base64'), { N: Number(N), r: Number(r), p: Number(p) })
    return key.length === expected.length && timingSafeEqual(key, expected)
}
