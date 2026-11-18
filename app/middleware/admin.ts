// Страницы админки — только для администратора. Настоящая защита — на сервере
// (defineAdminHandler), здесь лишь перенаправление на вход.
export default defineNuxtRouteMiddleware((to) => {
    const { loggedIn, user } = useUserSession()
    if (!loggedIn.value || user.value?.role !== 'admin') {
        return navigateTo({ path: '/admin/login', query: { redirect: to.fullPath } })
    }
})
