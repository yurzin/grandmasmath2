// Типы admin API (/api/admin/**). Тексты — исходный Markdown, не HTML.

export type CollectionStatus = 'draft' | 'published' | 'archived'

export interface AdminTaskListItem {
    id: number
    title: string | null
    label: string
    difficulty: number
    /** Задача ждёт проверки автором: что не так; null — не ждёт. */
    reviewNote: string | null
    updatedAt: string
    collections: { id: number, title: string, position: number }[]
}

/** То, что редактор отправляет при сохранении задачи. */
export interface AdminTaskInput {
    title: string | null
    taskTypeId: number
    topicId: number | null
    difficulty: number
    body: string
    answer: string
    /** Ответ для проверки («реши сам»): значения через «;»; null — проверки нет. */
    answerKey: string | null
    imageUrl: string | null
    source: string | null
    solutions: string[]
}

export interface AdminTask extends AdminTaskInput {
    id: number
    /** Пометка «на проверке» (снимается кнопкой «Проверено», в форме не редактируется). */
    reviewNote: string | null
    createdAt: string
    updatedAt: string
    collections: { id: number, title: string, slug: string, position: number }[]
}

export interface AdminTopic {
    id: number
    name: string
    slug: string
    /** Сколько задач ссылается на тему. */
    taskCount: number
}

export interface AdminTopicInput {
    name: string
    /** Пусто — сгенерировать из названия. */
    slug: string
}

export interface AdminTaskType {
    id: number
    number: number
    examLevel: ExamLevel
    name: string
    taskCount: number
}

export interface AdminTaskTypeInput {
    number: number
    examLevel: ExamLevel
    name: string
}

export interface AdminPlan {
    id: number
    months: number
    price: number
    active: boolean
}

export interface AdminPurchase {
    id: number
    kind: 'collection' | 'subscription'
    status: 'pending' | 'succeeded' | 'canceled'
    amount: number
    provider: string
    months: number | null
    accessUntil: string | null
    downloadCount: number
    createdAt: string
    paidAt: string | null
    email: string
    collectionTitle: string | null
}

export interface AdminPdfStatus {
    /** Есть PDF, собранный из текущего содержимого. */
    upToDate: boolean
    builtAt: string | null
    size: number | null
    /** Что конвертер Markdown → LaTeX пропустил (HTML, картинки…). */
    warnings: string[]
}

export interface AdminCollectionListItem {
    id: number
    slug: string
    title: string
    status: CollectionStatus
    price: number | null
    version: number
    taskCount: number
    updatedAt: string
}

export interface AdminCollectionInput {
    slug: string
    title: string
    description: string | null
    price: number | null
    status: CollectionStatus
    version: number
    coverUrl: string | null
    /** Задачи в порядке следования в сборнике. */
    tasks: { taskId: number, isFree: boolean }[]
}

export interface AdminCollection extends AdminCollectionInput {
    id: number
    createdAt: string
    updatedAt: string
    /** Подписи задач для списка в редакторе. */
    taskTitles: Record<number, string>
}
