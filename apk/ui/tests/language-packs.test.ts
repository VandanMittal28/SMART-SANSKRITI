import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { SUPPORTED_LANGUAGES } from '../lib/languages.ts'

const readPack = (language: string): Record<string, string> => JSON.parse(
  readFileSync(new URL(`../lib/locales/${language}.json`, import.meta.url), 'utf8'),
)
const source = readPack('en')
for (const language of SUPPORTED_LANGUAGES) {
  test(`${language.name} ships every catalogued interface string for offline startup`, () => {
    const pack = readPack(language.id)
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(source).sort())
    for (const [key, value] of Object.entries(pack)) {
      assert.equal(typeof value, 'string', key)
      assert.ok(value.trim(), key)
      assert.ok(!/__S\d+__/.test(value), `Translation marker leaked into ${key}`)
    }
  })
}
