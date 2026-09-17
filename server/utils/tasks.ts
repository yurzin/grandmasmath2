export interface TaskCard {
    id: number
    title: string
    description: string
    height: number
}

export interface TaskDetail extends TaskCard {
    answer: string
    difficulty: number
    topic: string | null
    taskType: string
    examLevel: 'base' | 'profile'
    solutions: string[]
}

const examLevelLabel: Record<'base' | 'profile', string> = {
    base: 'база',
    profile: 'профиль',
}

export function buildTaskTitle(taskTypeNumber: number, examLevel: 'base' | 'profile', topicName: string | null) {
    const prefix = `№${taskTypeNumber} (${examLevelLabel[examLevel]})`
    return topicName ? `${prefix} · ${topicName}` : prefix
}

export function buildTaskHeight(body: string) {
    return 160 + Math.min(200, body.length)
}
