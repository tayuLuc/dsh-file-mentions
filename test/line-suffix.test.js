import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { splitLineSuffix } from '../lib/line-suffix.js'

const here = dirname(fileURLToPath(import.meta.url))
const clientSource = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

test('splits the vault spelling `note.md:12` and its range form', () => {
  assert.deepEqual(splitLineSuffix('note.md:12'), { path: 'note.md', line: 12 })
  assert.deepEqual(splitLineSuffix('note.md:12-20'), { path: 'note.md', line: 12 })
  assert.deepEqual(splitLineSuffix('/abs/path/file.ts:7'), { path: '/abs/path/file.ts', line: 7 })
  assert.deepEqual(splitLineSuffix('file with space.md:44'), { path: 'file with space.md', line: 44 })
})

test('leaves references without a usable suffix alone', () => {
  assert.deepEqual(splitLineSuffix('note.md'), { path: 'note.md', line: undefined })
  assert.deepEqual(splitLineSuffix('a.md:0'), { path: 'a.md:0', line: undefined })
  assert.deepEqual(splitLineSuffix('a.md:'), { path: 'a.md:', line: undefined })
  assert.deepEqual(splitLineSuffix(':12'), { path: ':12', line: undefined })
  assert.deepEqual(splitLineSuffix(''), { path: '', line: undefined })
  assert.deepEqual(splitLineSuffix(undefined), { path: undefined, line: undefined })
})

test('an authority colon is not a line suffix', () => {
  // A drive letter is not the last colon, and a URL keeps its port.
  assert.deepEqual(splitLineSuffix('C:\\Users\\me\\x.md:12'), { path: 'C:\\Users\\me\\x.md', line: 12 })
  assert.deepEqual(splitLineSuffix('C:\\Users\\me\\x.md'), { path: 'C:\\Users\\me\\x.md', line: undefined })
  assert.deepEqual(splitLineSuffix('http://host:8080/a.md'), { path: 'http://host:8080/a.md', line: undefined })
})

test('a core fragment reference (#L12) reaches the parser unstripped', () => {
  // The harness core already understands `path#L12`; the fork only strips `:NN`.
  assert.deepEqual(splitLineSuffix('note.md#L12'), { path: 'note.md#L12', line: undefined })
})

test('client.js keeps the exact shipped implementation, not a copy', () => {
  // Клиентские бандлы в этом экосистемном стеке идут через window.__ModuleLoader__
  // без ESM-импортов, поэтому функцию не вынести в отдельный модуль. Тест закрывает
  // эту щель: вырезает ТОЧНО отгружаемое тело и сверяет его с эталоном на граничных случаях.
  const body = /function splitLineSuffix\(text\) \{\n(?:\s{8}.*\n)+\s{6}\}/.exec(clientSource)
  assert.ok(body !== null, 'splitLineSuffix body not found in lib/client.js')
  const shipped = new Function(`${body[0]}; return splitLineSuffix;`)()
  const cases = ['note.md:12', 'note.md:12-20', 'a.md:0', 'C:\\x.md:12', 'http://host:8080/a.md', 'note.md#L12', '']
  for (const input of cases) {
    assert.deepEqual(shipped(input), splitLineSuffix(input), `client.js disagrees on ${JSON.stringify(input)}`)
  }
})