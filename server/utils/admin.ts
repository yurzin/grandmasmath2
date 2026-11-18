import type { EventHandlerRequest, H3Event } from 'h3'
import type { User } from '#auth-utils'

/** Пускает только администратора: 401 без сессии, 403 для остальных. */
export async function requireAdmin(event: H3Event) {
    const { user } = await requireUserSession(event)
    if (user.role !== 'admin') {
        throw createError({ statusCode: 403, message: 'Доступ запрещён' })
    }
    return user
}

/** Обработчик, доступный только администратору. Все /api/admin/** пишутся через него. */
export function defineAdminHandler<T>(handler: (event: H3Event<EventHandlerRequest>, admin: User) => Promise<T>) {
    return defineEventHandler(async (event) => {
        const admin = await requireAdmin(event)
        return handler(event, admin)
    })
}

/** id из параметра маршрута; 400, если это не положительное целое. */
export function getIdParam(event: H3Event, name = 'id') {
    const id = Number(getRouterParam(event, name))
    if (!Number.isInteger(id) || id <= 0) {
        throw createError({ statusCode: 400, message: 'Некорректный идентификатор' })
    }
    return id
}
