import { latexInlineToMarkdown, latexToMarkdown, matchBrace } from './latex-to-markdown'

export interface ParsedTask {
    /** Номер варианта в сборнике (\task{Вариант N}{…}). */
    position: number
    title: string
    body: string
    solutions: string[]
    answer: string
    warnings: string[]
}

/** Аргумент команды \name{…} начиная с позиции from; возвращает [аргумент, позиция после }]. */
function readArg(s: string, from: number): [string, number] {
    const open = s.indexOf('{', from)
    const close = matchBrace(s, open)
    return [s.slice(open + 1, close), close + 1]
}

/** Разбирает all_tasks.tex: \task{Вариант N}{тема}, uslovie, \reshenie, \drugoe, \otvet{…}. */
export function parseCollection(tex: string): ParsedTask[] {
    const chunks = tex.split(/(?=\\task\{)/).filter(c => c.startsWith('\\task{'))

    return chunks.map((chunk) => {
        const [variant, afterVariant] = readArg(chunk, 0)
        const [rawTitle] = readArg(chunk, afterVariant)
        const position = Number(variant.match(/\d+/)?.[0])
        if (!position) throw new Error(`Не найден номер варианта: ${variant}`)

        const condMatch = chunk.match(/\\begin\{uslovie\}([\s\S]*?)\\end\{uslovie\}/)
        if (!condMatch) throw new Error(`Вариант ${position}: нет условия`)

        const solStart = chunk.indexOf('\\reshenie')
        const ansStart = chunk.indexOf('\\otvet{')
        if (solStart < 0 || ansStart < 0) throw new Error(`Вариант ${position}: нет решения или ответа`)
        const [rawAnswer] = readArg(chunk, ansStart)

        const warnings: string[] = []
        const conv = (r: { markdown: string, warnings: string[] }) => {
            warnings.push(...r.warnings)
            return r.markdown
        }

        const solutions = chunk
            .slice(solStart + '\\reshenie'.length, ansStart)
            .split('\\drugoe')
            .map(part => conv(latexToMarkdown(part)))
            .filter(Boolean)

        return {
            position,
            title: conv(latexInlineToMarkdown(rawTitle)),
            body: conv(latexToMarkdown(condMatch[1]!)),
            solutions,
            answer: conv(latexInlineToMarkdown(rawAnswer)).replace(/\.$/, ''),
            warnings: warnings.map(w => `Вариант ${position}: ${w}`),
        }
    })
}
