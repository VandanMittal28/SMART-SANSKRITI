import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAlerts, dispatch, retryDispatch, type DemoData, type DemoReport } from '../lib/demo.ts';
import { assessWithNvidia } from '../lib/nvidia-assessment.ts';
import { staff, zones } from '../lib/domain.ts';
const at='2026-10-01T10:00:00.000Z';
function fixture():{data:DemoData;report:DemoReport}{
 const report:DemoReport={id:'r1',receiptHash:'hash',category:'Property damage',note:'Broken sign',zoneId:'garden',point:{latitude:27,longitude:78},evidenceId:null,completionEvidenceId:null,assessment:'relevant',assessmentReason:'demo',status:'unassigned',assigneeId:null,assignmentReason:null,createdAt:at,assignedAt:null,resolvedAt:null,alerts:[],history:[]};
 return {report,data:{version:1,reports:[report],duties:staff.map((s,i)=>({id:s.id,zoneId:zones[i].id,onDuty:true,point:null,locationAt:null}))}};
}
test('dispatch prefers fresh GPS, then matching zone, and never doubles an active assignment',()=>{
 const {data,report}=fixture();
 data.duties[0].point={latitude:27,longitude:78.001};data.duties[0].locationAt=at;
 dispatch(data,report,at);assert.equal(report.assigneeId,data.duties[0].id);
 const second={...report,id:'r2',status:'unassigned' as const,assigneeId:null,assignedAt:null,history:[]};data.reports.push(second);
 dispatch(data,second,at);assert.equal(second.assigneeId,data.duties[1].id);
});
test('stale GPS falls back to duty zone; unavailable staff triggers retry',()=>{
 const {data,report}=fixture();data.duties[0].point={latitude:27,longitude:78};data.duties[0].locationAt='2026-10-01T09:55:00.000Z';
 dispatch(data,report,at);assert.equal(report.assigneeId,data.duties[1].id);
 const other=fixture();other.data.duties.forEach(d=>d.onDuty=false);dispatch(other.data,other.report,at);assert.deepEqual(other.report.alerts,['no_staff']);
 other.data.duties[2].onDuty=true;retryDispatch(other.data,at);assert.equal(other.report.assigneeId,other.data.duties[2].id);
});
test('alerts use receipt and assignment clocks and are idempotent',()=>{
 const {data,report}=fixture();dispatch(data,report,at);
 checkAlerts(data,'2026-10-01T10:01:00.000Z');assert.deepEqual(report.alerts,['unaccepted']);
 checkAlerts(data,'2026-10-01T10:05:00.000Z');checkAlerts(data,'2026-10-01T10:06:00.000Z');assert.deepEqual(report.alerts,['unaccepted','overdue']);
 report.status='resolved';checkAlerts(data,'2026-10-01T10:07:00.000Z');assert.equal(report.alerts.length,2);
});
test('NVIDIA assessment gates automatic dispatch and sends the report photo',async()=>{
 let requestBody: any;
 const fetcher = (async (_url:string,init:RequestInit)=>{
   requestBody=JSON.parse(String(init.body));
   return Response.json({choices:[{message:{content:'{"value":"relevant","reason":"A damaged sign warrants inspection."}'}}]});
 }) as typeof fetch;
 const result=await assessWithNvidia({category:'Property damage',note:'Broken sign',photo:Buffer.from('photo'),mime:'png'},{apiKey:'test-key',fetcher});
 assert.equal(result.value,'relevant');
 assert.equal(requestBody.messages[0].content[1].type,'image_url');
 const {data,report}=fixture();report.assessment=result.value;dispatch(data,report,at);assert.equal(report.status,'assigned');
});
test('missing key, unsupported photo and invalid model result require admin review',async()=>{
 const input={category:'Littering',note:'Trash near gate',photo:null,mime:''};
 assert.equal((await assessWithNvidia(input,{apiKey:''})).value,'unavailable');
 assert.equal((await assessWithNvidia({...input,photo:Buffer.from('photo'),mime:'webp'},{apiKey:'test-key'})).value,'unavailable');
 const bad=(async()=>Response.json({choices:[{message:{content:'not JSON'}}]})) as typeof fetch;
 const result=await assessWithNvidia(input,{apiKey:'test-key',fetcher:bad});
 assert.equal(result.value,'unavailable');
 const {data,report}=fixture();report.assessment=result.value;report.status='review';dispatch(data,report,at);assert.equal(report.assigneeId,null);
});
test('an automated camera detection waits for a human even when triage says relevant',()=>{
 const {data,report}=fixture();
 // Worst case for the guard: the independent triage is confident, staff are
 // free, and GPS is fresh. An unconfirmed machine guess must still not move
 // anyone until an admin confirms it.
 report.origin='automated';report.status='review';report.assessment='relevant';
 data.duties[0].point={latitude:27,longitude:78.001};data.duties[0].locationAt=at;
 dispatch(data,report,at);
 assert.equal(report.assigneeId,null);
 assert.equal(report.status,'review');
 // Admin confirmation is what releases it, exactly as for a visitor report.
 report.status='unassigned';
 dispatch(data,report,at);
 assert.equal(report.assigneeId,data.duties[0].id);
 assert.equal(report.status,'assigned');
});
test('a visitor report with no origin keeps dispatching as before',()=>{
 const {data,report}=fixture();
 assert.equal(report.origin,undefined);
 dispatch(data,report,at);
 assert.equal(report.status,'assigned');
});
