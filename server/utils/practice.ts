import type { H3Event } from 'h3'
import { and, asc, eq, inArray } from 'drizzle-orm'

/** Ответ и решения задачи в HTML — отдаются только тем, кому они открыты. */
export async function loadSolutionContent(taskId: number, answer: string) {
    const rows = await db.select({ body: schema.solutions.body }).from(schema.solutions)
        .where(eq(schema.solutions.taskId, taskId))
        .orderBy(asc(schema.solutions.sortOrder))
    return {
        answerHtml: renderMarkdownInline(answer),
        solutionsHtml: rows.map(s => renderMarkdown(s.body)),
    }
}

/** Сборники, в которые входит задача. */
export function taskMemberships(taskId: number) {
    return db
        .select({
            collectionId: schema.collections.id,
            slug: schema.collections.slug,
            title: schema.collections.title,
            status: schema.collections.status,
            position: schema.collectionTasks.position,
            isFree: schema.collectionTasks.isFree,
        })
        .from(schema.collectionTasks)
        .innerJoin(schema.collections, eq(schema.collectionTasks.collectionId, schema.collections.id))
        .where(eq(schema.collectionTasks.taskId, taskId))
}

/** Открыта ли задача текущему пользователю (ответ, решения, «реши сам»). */
export async function taskUnlocked(event: H3Event, taskId: number) {
    return canViewSolution(event, await taskMemberships(taskId))
}

/** id задач (из списка), которые пользователь решил верно. */
export async function solvedTaskIds(userId: number, taskIds: number[]) {
    if (!taskIds.length) return new Set<number>()
    const rows = await db.selectDistinct({ taskId: schema.attempts.taskId }).from(schema.attempts)
        .where(and(
            eq(schema.attempts.userId, userId),
            eq(schema.attempts.correct, true),
            inArray(schema.attempts.taskId, taskIds),
        ))
    return new Set(rows.map(r => r.taskId))
}
