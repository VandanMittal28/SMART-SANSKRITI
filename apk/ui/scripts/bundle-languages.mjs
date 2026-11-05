// Refresh checked-in interface packs through the existing translation API.
// Run with the local Next server running: node scripts/bundle-languages.mjs
import fs from 'node:fs/promises'
import ts from 'typescript'
import vm from 'node:vm'
const source = await fs.readFile(new URL('../lib/languageContext.tsx', import.meta.url), 'utf8')
const declaration = source.slice(source.indexOf('export const TRANSLATIONS:'), source.indexOf('type LangUpdater'))
const code = ts.transpile(declaration.replace('export const', 'const') + '\nglobalThis.entries = TRANSLATIONS;', { target: ts.ScriptTarget.ES2022 })
const context = vm.createContext({})
vm.runInContext(code, context)
const entries = Object.values(context.entries)
const texts = [...new Set(entries.map(entry => entry.en.trim()))]
const languages = [...(await fs.readFile(new URL('../lib/languages.ts', import.meta.url), 'utf8')).matchAll(/id: '([^']+)'/g)].map(match => match[1])
const origin = process.env.TRANSLATION_ORIGIN || 'http://127.0.0.1:3456'
const queue = [...languages]
async function worker() {
  for (let language; (language = queue.shift());) {
    const path = new URL(`../lib/locales/${language}.json`, import.meta.url)
    let pack = {}
    try { pack = JSON.parse(await fs.readFile(path, 'utf8')) } catch {}
    if (language === 'en' || language === 'hi') {
      for (const entry of entries) if (entry[language]) pack[entry.en.trim()] = entry[language]
    }
    const missing = texts.filter(text => !pack[text])
    const size = ['he', 'ms', 'sw'].includes(language) ? 10 : 30
    for (let offset = 0; offset < missing.length; offset += size) {
      const batch = missing.slice(offset, offset + size)
      const translations = await translateBatch(batch, language)
      batch.forEach((text, i) => { pack[text] = translations[i] })
      await fs.writeFile(path, JSON.stringify(pack, null, 2) + '\n')
    }
    await fs.writeFile(path, JSON.stringify(pack, null, 2) + '\n')
    console.log(`${language}: ${texts.length} interface strings bundled`)
  }
}
async function translateBatch(texts, language, attempt = 0) {
  try {
    const response = await fetch(`${origin}/api/site-translate/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, texts }), signal: AbortSignal.timeout(120000),
    })
    const data = await response.json()
    if (!response.ok || data.translations?.length !== texts.length || data.translations.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error(`Translation failed for ${language}: ${data.error || response.status}`)
    }
    return data.translations
  } catch (error) {
    if (texts.length > 1) {
      const middle = Math.ceil(texts.length / 2)
      return [...await translateBatch(texts.slice(0, middle), language), ...await translateBatch(texts.slice(middle), language)]
    }
    if (attempt >= 2) throw error
    return translateBatch(texts, language, attempt + 1)
  }
}
await Promise.all(Array.from({ length: 6 }, () => worker()))
