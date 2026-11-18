// Типы ответов API, общие для app/ и server/ (автоимпорт Nuxt из shared/types).

export type ExamLevel = 'base' | 'profile'

export interface TaskCard {
    id: number
    /** Заголовок задачи (если задан) или номер ЕГЭ с темой. */
    title: string
    /** Номер ЕГЭ и тема, например «№16 (профиль) · Финансовая математика». */
    label: string
    /** HTML первого абзаца условия. */
    excerptHtml: string
}

export interface TaskCollectionRef {
    slug: string
    title: string
    position: number
}

export interface TaskDetail {
    id: number
    title: string
    label: string
    bodyHtml: string
    /** Ответ и решения закрыты (платная задача сборника) — answerHtml null, solutionsHtml пуст. */
    locked: boolean
    answerHtml: string | null
    solutionsHtml: string[]
    difficulty: number
    topic: string | null
    taskType: string
    examLevel: ExamLevel
    imageUrl: string | null
    collection: TaskCollectionRef | null
}

export interface CollectionCard {
    slug: string
    title: string
    description: string | null
    /** Цена в рублях; null — не назначена. */
    price: number | null
    coverUrl: string | null
    taskCount: number
}

export interface CollectionDetail extends Omit<CollectionCard, 'taskCount'> {
    tasks: {
        id: number
        position: number
        title: string | null
        isFree: boolean
    }[]
}
