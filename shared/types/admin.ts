// Типы admin API (/api/admin/**). Тексты — исходный Markdown, не HTML.

export type CollectionStatus = 'draft' | 'published' | 'archived'

export interface AdminTaskListItem {
    id: number
    title: string | null
    label: string
    difficulty: number
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
    imageUrl: string | null
    source: string | null
    solutions: string[]
}

export interface AdminTask extends AdminTaskInput {
    id: number
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
