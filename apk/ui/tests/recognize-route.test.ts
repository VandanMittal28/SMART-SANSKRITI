import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

// Exercise the actual route with inference stubbed: no credentials or network.
function loadRoute(key = 'test-key', fail = false) {
  const source = readFileSync(new URL('../app/api/recognize/route.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports: { POST?: (request: Request) => Promise<Response> } = {}
  const calls: string[] = []
  runInNewContext(compiled, {
    exports, Buffer, process: { env: { NVIDIA_API_KEY: key } },
    require(name: string) {
      if (name === 'next/server') return { NextResponse: Response }
      if (name === '@/lib/gemini') return { GeminiError: class GeminiError extends Error { status: number; constructor(status: number) { super('Vision error'); this.status = status } } }
      if (name === '@/lib/nvidia') return { recognizeMonument: async (image: string) => {
        calls.push(image)
        if (fail) throw new Error('private upstream details')
        return { monument_name: 'Taj Mahal', confidence_score: 94 }
      } }
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  return { post: exports.POST!, calls }
}
const image = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(150)]).toString('base64')
const request = (body: unknown) => new Request('http://localhost/api/recognize', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

test('recognition route forwards a valid JPEG and returns the result', async () => {
  const { post, calls } = loadRoute()
  const response = await post(request({ image_b64: image }))
  assert.equal(response.status, 200)
  assert.equal((await response.json()).monument_name, 'Taj Mahal')
  assert.deepEqual(calls, [image])
})

test('invalid and oversized images never reach inference', async () => {
  const { post, calls } = loadRoute()
  for (const body of [null, {}, { image_b64: 'not an image' }, { image_b64: Buffer.alloc(150).toString('base64') }]) {
    assert.equal((await post(request(body))).status, 400)
  }
  assert.equal((await post(request({ image_b64: 'a'.repeat(2_100_001) }))).status, 413)
  assert.equal(calls.length, 0)
})

test('missing configuration and upstream failures return safe service errors', async () => {
  assert.equal((await loadRoute('').post(request({ image_b64: image }))).status, 503)
  const response = await loadRoute('test-key', true).post(request({ image_b64: image }))
  assert.equal(response.status, 502)
  assert.doesNotMatch(await response.text(), /private upstream/)
})
