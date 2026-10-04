// FORK(line-suffix) — the vault cites a note as `note.md:12` / `note.md:12-20`,
// and a markdown link to a file carries the same spelling. The suffix must
// never reach the fs read (`note.md:12` -> ENOENT); the line rides along so the
// editor can jump to it. A Windows drive letter is not the last colon, so
// `C:\x.md:12` survives. Kept as a separate module because every client bundle
// in this ecosystem ships through `window.__ModuleLoader__` with no ESM imports —
// the one seam a test can reach without booting a browser.
const SUFFIX = /^(.*?):(\d+)(?:-(\d+))?$/u

/**
 * Split a `path:line` or `path:from-to` reference.
 * @param {string} text
 * @returns {{ path: string, line: number|undefined }} path without the suffix;
 *   `line` is the first number, undefined when there is no usable suffix.
 */
export function splitLineSuffix(text) {
  if (typeof text !== 'string' || text === '') return { path: text, line: undefined }
  const m = SUFFIX.exec(text)
  if (m === null) return { path: text, line: undefined }
  const line = Number(m[2])
  if (m[1] === '' || !Number.isSafeInteger(line) || line < 1) return { path: text, line: undefined }
  return { path: m[1], line }
}