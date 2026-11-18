import { z } from 'zod'

z.config(z.locales.ru())

/** Подписи полей для сообщений об ошибках. */
const FIELD_LABELS: Record<string, string> = {
    title: 'Заголовок',
    taskTypeId: 'Номер ЕГЭ',
    topicId: 'Тема',
    difficulty: 'Сложность',
    body: 'Условие',
    answer: 'Ответ',
    imageUrl: 'Картинка',
    source: 'Источник',
    solutions: 'Решения',
    slug: 'Адрес (slug)',
    description: 'Описание',
    price: 'Цена',
    status: 'Статус',
    version: 'Версия',
    coverUrl: 'Обложка',
    tasks: 'Задачи',
    name: 'Название',
    number: 'Номер задания',
    examLevel: 'Уровень',
    email: 'Email',
    password: 'Пароль',
}

/**
 * Валидатор для readValidatedBody/getValidatedQuery: при ошибке — 400
 * с одной понятной строкой «Поле: что не так» в message.
 */
export function validator<S extends z.ZodType>(schema: S) {
    return (data: unknown): z.output<S> => {
        const result = schema.safeParse(data)
        if (result.success) return result.data
        const issue = result.error.issues[0]!
        const field = FIELD_LABELS[String(issue.path[0])]
        throw createError({ statusCode: 400, message: field ? `${field}: ${issue.message}` : issue.message })
    }
}
