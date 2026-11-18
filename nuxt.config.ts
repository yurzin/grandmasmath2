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
    },
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true }
})
