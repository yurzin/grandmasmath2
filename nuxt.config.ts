import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
    modules: ['@nuxt/ui', '@nuxthub/core', '@nuxt/eslint', 'nuxt-auth-utils'],
    hub: {
        db: {
            dialect: 'postgresql',
            casing: 'snake_case'
        }
    },
    css: ['katex/dist/katex.min.css', '~/assets/css/main.css'],
    nitro: {
        // Шаблон PDF-сборника (LaTeX, обложки, шрифт водяного знака) — читается через useStorage('assets:pdf-template').
        serverAssets: [{ baseName: 'pdf-template', dir: fileURLToPath(new URL('./server/pdf-template', import.meta.url)) }],
        // Фоновые задачи (server/tasks): напоминания об окончании подписки — каждый день в 10:00 по времени сервера.
        experimental: { tasks: true },
        scheduledTasks: { '0 10 * * *': ['subscriptions:remind'] },
    },
    // Секреты и настройки продаж — через переменные окружения NUXT_* (см. .env.example).
    runtimeConfig: {
        /** Адрес сайта для ссылок в письмах и возврата после оплаты. NUXT_SITE_URL */
        siteUrl: 'http://localhost:3000',
        mail: {
            /** smtps://логин:пароль@smtp.yandex.ru:465 — NUXT_MAIL_SMTP_URL; пусто — письма в консоль (только dev). */
            smtpUrl: '',
            /** NUXT_MAIL_FROM */
            from: 'Сборники ЕГЭ <no-reply@localhost>',
        },
        yookassa: {
            /** NUXT_YOOKASSA_SHOP_ID / NUXT_YOOKASSA_SECRET_KEY; пусто — в dev тестовая оплата без ЮKassa. */
            shopId: '',
            secretKey: '',
            /** Чек 54-ФЗ: '' — не передавать (самозанятый: чек формирует ЮKassa/«Мой налог»), 'on' — передавать receipt (ИП с онлайн-кассой). NUXT_YOOKASSA_RECEIPT */
            receipt: '',
            /** Ставка НДС для чека (1 — без НДС). NUXT_YOOKASSA_VAT_CODE */
            vatCode: 1,
            /** Признак предмета расчёта для чека. NUXT_YOOKASSA_PAYMENT_SUBJECT */
            paymentSubject: 'commodity',
        },
    },
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true }
})
