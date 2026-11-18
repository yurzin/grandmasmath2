/** Подпись задачи по реальному номеру задания ЕГЭ, например «Задание 16 · Экономическая задача». */
export function buildTaskLabel(taskTypeNumber: number, examLevel: ExamLevel, taskTypeName: string) {
    return taskTypeLabel(taskTypeNumber, examLevel, taskTypeName)
}
