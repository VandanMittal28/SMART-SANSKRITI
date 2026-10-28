import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReport } from '../lib/server/validate.ts';
import { reportingMode } from '../lib/server/ops.ts';
const report = {id:'12345678-1234-4123-8123-123456789012',token:'a'.repeat(64),siteId:'taj-mahal',zoneId:'east-gate',category:'Littering',note:'Test',point:null,photo:null};
test('hosted reports require a supported site and valid zone key',()=>{
 assert.equal(validateReport(report,"hosted-mms").siteId,'taj-mahal');
 assert.throws(()=>validateReport({...report,siteId:'unknown'},"hosted-mms"));
 assert.throws(()=>validateReport({...report,zoneId:'../invalid'},"hosted-mms"));
 assert.throws(()=>validateReport({...report,point:{latitude:0,longitude:0,accuracy:100001}},"hosted-mms"));
});
test('hosted reporting requires database settings',()=>{
 assert.equal(reportingMode({VERCEL:'1',REPORTS_MODE:'supabase'}),'unavailable');
 assert.equal(reportingMode({VERCEL:'1',REPORTS_MODE:'supabase',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test'}),'hosted-mms');
});
