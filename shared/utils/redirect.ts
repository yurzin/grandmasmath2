/** Путь внутри сайта, куда безопасно перенаправить: начинается с одного «/» (не «//host» и не «/\host»). */
export function isSafeNextPath(path: unknown): path is string {
    return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}
