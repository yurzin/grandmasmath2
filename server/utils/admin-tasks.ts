import { asc, eq } from 'drizzle-orm'

type Db = typeof db
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Задача целиком (исходный Markdown) для редактора; 404, если нет. */
export async function loadAdminTask(id: number): Promise<AdminTask> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1)
    if (!task) throw createError({ statusCode: 404, message: 'Задача не найдена' })

    const [solutionRows, collectionRows] = await Promise.all([
        db.select({ body: schema.solutions.body }).from(schema.solutions)
            .where(eq(schema.solutions.taskId, id))
            .orderBy(asc(schema.solutions.sortOrder)),
        db.select({
            id: schema.collections.id,
            title: schema.collections.title,
            slug: schema.collections.slug,
            position: schema.collectionTasks.position,
        })
            .from(schema.collectionTasks)
            .innerJoin(schema.collections, eq(schema.collectionTasks.collectionId, schema.collections.id))
            .where(eq(schema.collectionTasks.taskId, id)),
    ])

    return {
        id: task.id,
        title: task.title,
        taskTypeId: task.taskTypeId,
        topicId: task.topicId,
        difficulty: task.difficulty,
        body: task.body,
        answer: task.answer,
        imageUrl: task.imageUrl,
        source: task.source,
        solutions: solutionRows.map(s => s.body),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        collections: collectionRows,
    }
}

/** Записывает поля задачи и заменяет её решения; возвращает id. */
export async function saveTask(tx: Tx, input: AdminTaskInput, id?: number) {
    const { solutions, ...fields } = input
    let taskId = id
    if (taskId) {
        const updated = await tx.update(schema.tasks).set(fields)
            .where(eq(schema.tasks.id, taskId)).returning({ id: schema.tasks.id })
        if (!updated.length) throw createError({ statusCode: 404, message: 'Задача не найдена' })
        await tx.delete(schema.solutions).where(eq(schema.solutions.taskId, taskId))
    } else {
        const [created] = await tx.insert(schema.tasks).values(fields).returning({ id: schema.tasks.id })
        taskId = created!.id
    }
    if (solutions.length) {
        await tx.insert(schema.solutions).values(
            solutions.map((body, i) => ({ taskId: taskId!, body, sortOrder: i + 1 })),
        )
    }
    return taskId
}
