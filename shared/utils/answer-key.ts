/**
 * «Реши сам»: ответ для проверки — допустимые значения через «;».
 * Число сравнивается как число («1 440 000» = «1440000», «2,6» = «2.6»),
 * остальное — как текст без учёта регистра и лишних пробелов.
 */

// \s в JS покрывает и неразрывные пробелы (U+00A0, U+202F) — «1 440 000» в любом наборе.
const DIGIT_GAP = /(\d)\s+(?=\d)/g

/** Первое число в строке: «1 440 000 руб.» → 1440000, «13,5%» → 13.5. */
export function parseAnswerNumber(text: string): number | null {
    const m = text.replace(DIGIT_GAP, '$1').match(/[-−]?\d+(?:[.,]\d+)?/)
    if (!m) return null
    return Number(m[0].replace('−', '-').replace(',', '.'))
}

function isPureNumber(text: string) {
    return /^[-−]?\d+(?:[.,]\d+)?%?$/.test(text.replace(DIGIT_GAP, '$1').trim())
}

function normalizeText(text: string) {
    return text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim()
}

function sameNumber(a: number, b: number) {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b))
}

export function splitAnswerKey(key: string) {
    return key.split(';').map(s => s.trim()).filter(Boolean)
}

/** Подходит ли ответ пользователя к ключу. */
export function checkAnswer(input: string, key: string) {
    const answer = input.trim()
    if (!answer) return false
    const number = parseAnswerNumber(answer)
    return splitAnswerKey(key).some((accepted) => {
        if (isPureNumber(accepted)) {
            const expected = parseAnswerNumber(accepted)
            return number !== null && expected !== null && sameNumber(number, expected)
        }
        return normalizeText(answer) === normalizeText(accepted)
    })
}

function formatNumber(n: number) {
    return String(Number(n.toPrecision(12)))
}

/**
 * Ключ проверки из текстового ответа: числа во всех разумных единицах,
 * потому что пользователь может ответить в рублях, тысячах или миллионах.
 *   «1440 тыс. рублей (или 1 440 000 рублей)» → «1440; 1.44; 1440000»
 *   «2 млн 600 тыс. рублей» → «2600000; 2600; 2.6»
 *   «$r = 13{,}5\%$» → «13.5»
 */
export function suggestAnswerKey(answer: string) {
    const text = answer
        .replace(/\$/g, '')
        .replace(/\{,\}/g, ',')
        .replace(/\\[,;: ]/g, '')
        .replace(/\\%/g, '%')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(DIGIT_GAP, '$1')

    const values: number[] = []
    const re = /(\d+(?:[.,]\d+)?)\s*(млн|тыс|руб|%)?\.?(?:\s*(?:руб\S*)?\s*(\d+(?:[.,]\d+)?)\s*тыс)?/gi
    for (const m of text.matchAll(re)) {
        const v = Number(m[1]!.replace(',', '.'))
        const unit = m[2]?.toLowerCase()
        const extraThousands = m[3] ? Number(m[3].replace(',', '.')) : null

        if (unit === 'млн' && extraThousands !== null) {
            const rub = v * 1e6 + extraThousands * 1e3
            values.push(rub, rub / 1e3, rub / 1e6)
        } else if (unit === 'млн') {
            values.push(v, v * 1e3, v * 1e6)
        } else if (unit === 'тыс') {
            values.push(v, v / 1e3, v * 1e3)
        } else if (unit === '%') {
            values.push(v)
        } else if (v >= 1000) {
            values.push(v, v / 1e3, v / 1e6)
        } else {
            values.push(v)
        }
    }
    return [...new Set(values.map(formatNumber))].join('; ')
}
