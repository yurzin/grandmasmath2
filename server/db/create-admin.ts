/**
 * Создать администратора или сменить ему пароль:
 *
 *   npm run admin:create -- email@example.com "Имя"
 *
 * Пароль спрашивается в терминале (не виден при вводе и не попадает в историю shell).
 */
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users } from './schema'
import { hashPassword } from '../lib/password'

const [emailArg, name = 'Администратор'] = process.argv.slice(2)
const email = emailArg?.trim().toLowerCase() ?? ''
if (!email.includes('@')) {
    console.error('Использование: npm run admin:create -- email@example.com "Имя"')
    process.exit(1)
}

function askHidden(question: string) {
    return new Promise<string>((resolve) => {
        const { stdin, stdout } = process
        stdout.write(question)
        if (!stdin.isTTY) {
            // Нет терминала (например, пароль передан через pipe) — читаем строку как есть.
            let data = ''
            stdin.setEncoding('utf8')
            stdin.on('data', chunk => (data += chunk))
            stdin.on('end', () => resolve(data.split(/\r?\n/)[0] ?? ''))
            return
        }
        let input = ''
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')
        const onData = (ch: string) => {
            if (ch === '\r' || ch === '\n') {
                stdin.setRawMode(false)
                stdin.pause()
                stdin.off('data', onData)
                stdout.write('\n')
                resolve(input)
            } else if (ch === '\u0003') {
                process.exit(130)
            } else if (ch === '\u007f' || ch === '\b') {
                input = input.slice(0, -1)
            } else {
                input += ch
            }
        }
        stdin.on('data', onData)
    })
}

async function main() {
    const password = await askHidden('Пароль (не менее 10 символов): ')
    if (password.length < 10) throw new Error('Пароль короче 10 символов')
    if (process.stdin.isTTY) {
        const again = await askHidden('Повторите пароль: ')
        if (again !== password) throw new Error('Пароли не совпадают')
    }

    process.loadEnvFile('.env')
    const sql = postgres(process.env.DATABASE_URL!)
    const db = drizzle(sql, { casing: 'snake_case' })
    try {
        const hash = await hashPassword(password)
        const [user] = await db.insert(users)
            .values({ email, name, password: hash, role: 'admin' })
            .onConflictDoUpdate({ target: users.email, set: { password: hash, role: 'admin', name } })
            .returning({ id: users.id })
        console.log(`Готово: администратор ${email} (id ${user!.id})`)
    } finally {
        await sql.end()
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
})
