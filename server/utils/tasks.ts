const examLevelLabel: Record<ExamLevel, string> = {
    base: 'база',
    profile: 'профиль',
}

export function buildTaskLabel(taskTypeNumber: number, examLevel: ExamLevel, topicName: string | null) {
    const prefix = `№${taskTypeNumber} (${examLevelLabel[examLevel]})`
    return topicName ? `${prefix} · ${topicName}` : prefix
}
