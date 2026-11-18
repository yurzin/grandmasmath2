// Данные пользователя в сессии nuxt-auth-utils (видны и клиенту — без секретов).
declare module '#auth-utils' {
    interface User {
        id: number
        name: string
        email: string
        role: 'user' | 'admin'
    }
}

export {}
