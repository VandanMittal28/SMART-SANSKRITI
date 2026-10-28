import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/narrate/route.ts';
import {resetRateLimits} from '../lib/server/http.ts';
test('Explore narration accepts the mobile request and returns playable audio, not JSON',async()=>{
 const originalFetch=globalThis.fetch; const originalKey=process.env.NVIDIA_API_KEY;
 process.env.NVIDIA_API_KEY='test-only'; resetRateLimits();
 globalThis.fetch=async (_input,init)=>{
  assert.ok(init?.body instanceof FormData);
  assert.equal(init.body.get('language'),'en-US');
  assert.equal(init.body.get('voice'),'Magpie-Multilingual.EN-US.Leo.Calm');
  return new Response(Buffer.from('RIFFtestWAVE'),{headers:{'Content-Type':'audio/wav'}});
 };
 try {
  const r=await POST(new Request('http://localhost/api/narrate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Welcome to the Taj Mahal.',monumentId:'taj-mahal',language:'en'})}));
  assert.equal(r.status,200); assert.equal(r.headers.get('content-type'),'audio/wav');
  assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,4).toString(),'RIFF');
 } finally {globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.NVIDIA_API_KEY;else process.env.NVIDIA_API_KEY=originalKey;}
});
