import type { H3Event } from 'h3'

/**
 * Можно ли показать ответ и решение задачи.
 * Задачи вне сборников и бесплатные задачи сборника открыты всем.
 * TODO (этап 4): пускать купивших сборник пользователей.
 */
export async function canViewSolution(
    _event: H3Event,
    collection: { isFree: boolean } | undefined,
): Promise<boolean> {
    if (!collection) return true
    return collection.isFree
}
