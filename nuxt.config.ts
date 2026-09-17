export default defineNuxtConfig({
    modules: ['@nuxt/ui', '@nuxthub/core'],
    hub: {
        db: 'postgresql'
    },
    css: ['~/assets/css/main.css'],
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true }
})
