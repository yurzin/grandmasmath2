import { tasks } from '../../utils/tasks'

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, 'id'))

    const item = tasks.find((i) => i.id === id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Не найдено' })

    return item
})
