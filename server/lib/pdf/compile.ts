// Сборка PDF через XeLaTeX во временной папке.
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const XELATEX = process.env.XELATEX_PATH || 'xelatex'
const RUN_TIMEOUT_MS = 180_000

export class LatexError extends Error {
    constructor(message: string, readonly log: string) {
        super(message)
    }
}

function run(cwd: string) {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(XELATEX, [
            '-interaction=nonstopmode',
            '-halt-on-error',
            '-no-shell-escape', // никаких внешних команд из документа
            'main.tex',
        ], {
            cwd,
            // TeX Live: запрет чтения/записи файлов вне рабочей папки.
            env: { ...process.env, openin_any: 'p', openout_any: 'p' },
            windowsHide: true,
        })
        const timer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS)
        child.stdout.resume()
        child.stderr.resume()
        child.on('error', (err) => {
            clearTimeout(timer)
            reject(new LatexError(`Не удалось запустить XeLaTeX (${XELATEX}): ${err.message}`, ''))
        })
        child.on('close', (code, signal) => {
            clearTimeout(timer)
            if (code === 0) resolve()
            else reject(new LatexError(signal ? 'XeLaTeX не уложился во время' : `XeLaTeX завершился с кодом ${code}`, ''))
        })
    })
}

/** Ошибки из main.log: строки «! …» и контекст «l.N …» после них. */
export function extractLatexErrors(log: string) {
    const lines = log.split(/\r?\n/)
    const out: string[] = []
    lines.forEach((line, i) => {
        if (line.startsWith('!')) out.push(...lines.slice(i, i + 6).filter(Boolean))
    })
    return out.slice(0, 40).join('\n')
}

/**
 * По строке «l.N текст» из лога находит, в какой задаче ошибка: ищет текст в tasks.tex
 * и ближайший выше маркер «% ---------- Вариант N ----------».
 */
export function locateLatexError(log: string, tasksTex: string | undefined) {
    const context = log.match(/^l\.\d+ (.+)$/m)?.[1]?.trim()
    if (!context || !tasksTex) return null
    const lines = tasksTex.split('\n')
    const needle = context.slice(0, 40)
    const at = lines.findIndex(line => line.includes(needle))
    for (let i = at; i >= 0; i--) {
        const marker = lines[i]!.match(/^% -{5,} (.+?) -{5,}$/)
        if (marker) return marker[1]!
    }
    return null
}

const MAX_PASSES = 4

/**
 * Компилирует файлы (имя → содержимое) и возвращает PDF.
 * Проходы повторяются, пока не устоится оглавление: на первом оно пустое,
 * на втором вырастает и сдвигает страницы, поэтому обычно нужно три.
 */
export async function compileLatex(files: Record<string, string>) {
    const dir = await mkdtemp(join(tmpdir(), 'gm-pdf-'))
    try {
        for (const [name, content] of Object.entries(files)) {
            await writeFile(join(dir, name), content, 'utf8')
        }
        let previousToc: string | null = null
        let passes = 0
        while (passes < MAX_PASSES) {
            passes++
            try {
                await run(dir)
            } catch (err) {
                const log = await readFile(join(dir, 'main.log'), 'utf8').catch(() => '')
                const errors = extractLatexErrors(log)
                const where = locateLatexError(errors, files['tasks.tex'])
                const message = (err instanceof Error ? err.message : String(err)) + (where ? `. Ошибка, судя по всему, в: ${where}` : '')
                throw new LatexError(message, errors || log.slice(-3000))
            }
            const toc = await readFile(join(dir, 'main.toc'), 'utf8').catch(() => '')
            if (toc === previousToc) break
            previousToc = toc
        }
        const log = await readFile(join(dir, 'main.log'), 'utf8')
        const pages = Number(log.match(/Output written on main\.pdf \((\d+) pages?/)?.[1] ?? 0)
        return { pdf: await readFile(join(dir, 'main.pdf')), pages, passes }
    } finally {
        await rm(dir, { recursive: true, force: true })
    }
}
