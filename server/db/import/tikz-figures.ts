// Отрисовка рисунков TikZ в SVG для сайта: XeLaTeX (standalone, без PDF) → dvisvgm с текстом в кривых.
// Запускается при импорте сборника на машине автора; готовые SVG кладутся в public/figures и коммитятся.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tikzFigureName } from '../../lib/tikz'

export const FIGURES_DIR = 'public/figures'

// Шрифты и цвета — как в шаблоне PDF (server/pdf-template/main.tex), чтобы рисунок выглядел одинаково.
const PREAMBLE = String.raw`\documentclass[tikz,dvisvgm,border=4pt]{standalone}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{DejaVu Sans}
\setmathfont{texgyredejavu-math.otf}
\usepackage{polyglossia}
\setdefaultlanguage{russian}
\newfontfamily\cyrillicfont{DejaVu Sans}
\usetikzlibrary{calc,arrows.meta}
\definecolor{ink}{HTML}{1F2937}
\definecolor{titleblue}{HTML}{2F3E5C}
\definecolor{accent}{HTML}{3A5A98}
\definecolor{muted}{HTML}{7A869A}
\color{ink}
`

/** Отрисовывает рисунки, для которых ещё нет SVG. Возвращает число новых файлов. */
export function renderTikzFigures(codes: string[], log = console.log): number {
    mkdirSync(FIGURES_DIR, { recursive: true })
    let created = 0
    for (const code of new Set(codes)) {
        const name = tikzFigureName(code)
        const target = join(FIGURES_DIR, `${name}.svg`)
        if (existsSync(target)) continue

        const dir = mkdtempSync(join(tmpdir(), 'tikz-'))
        try {
            writeFileSync(join(dir, 'fig.tex'), `${PREAMBLE}\\begin{document}\n${code.trim()}\n\\end{document}\n`)
            try {
                execFileSync('xelatex', ['-no-pdf', '-interaction=nonstopmode', '-halt-on-error', 'fig.tex'], { cwd: dir, stdio: 'pipe' })
            } catch {
                const tail = readFileSync(join(dir, 'fig.log'), 'utf8').split('\n').filter(l => l.startsWith('!')).slice(0, 3).join('\n')
                throw new Error(`Рисунок ${name} не собрался:\n${tail}\n${code.slice(0, 200)}`)
            }
            // --no-fonts: буквы и формулы превращаются в контуры — SVG не зависит от шрифтов на устройстве.
            execFileSync('dvisvgm', ['--no-fonts', '--exact-bbox', '--output=fig.svg', 'fig.xdv'], { cwd: dir, stdio: 'pipe' })
            writeFileSync(target, readFileSync(join(dir, 'fig.svg')))
            log(`  рисунок ${target}`)
            created++
        } finally {
            rmSync(dir, { recursive: true, force: true })
        }
    }
    return created
}
