import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | null = null

export interface MailMessage {
    to: string
    subject: string
    text: string
    html?: string
}

/**
 * Отправка письма через SMTP (NUXT_MAIL_SMTP_URL).
 * Без SMTP в режиме разработки письмо печатается в консоль сервера, в продакшене — ошибка.
 */
export async function sendMail(message: MailMessage) {
    const { mail } = useRuntimeConfig()
    if (!mail.smtpUrl) {
        if (import.meta.dev) {
            console.info(`\n[mail] Письмо (SMTP не настроен) → ${message.to}\nТема: ${message.subject}\n${message.text}\n`)
            return
        }
        throw createError({ statusCode: 503, message: 'Отправка писем не настроена' })
    }
    transporter ??= nodemailer.createTransport(mail.smtpUrl)
    await transporter.sendMail({ from: mail.from, ...message })
}
