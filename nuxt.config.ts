export default defineNuxtConfig({
    modules: ['@nuxt/ui', '@nuxthub/core', '@nuxt/eslint'],
    hub: {
        db: {
            dialect: 'postgresql',
            casing: 'snake_case'
        }
    },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true }
})
