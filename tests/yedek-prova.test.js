import {dryRunRestore,KINDS} from "../assets/yedek-prova-kontrol.js";
const UID="12345678-1234-4234-8234-123456789abc";
const TOKEN="TEST-ONLY.fake.token.never-real-0";
const APP="https://tffvwxskvjuxoekwgdef.supabase.co";
const checks=(condition,message)=>{if(!condition)throw Error(message)};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
function mock({uid=UID,broken=null,missing=null}={}){
 const seen=[];
 const fetcher=async(input,options)=>{
  const url=String(input);
  seen.push({url,options});
  if(url.endsWith("/auth/v1/user"))return json({id:uid});
  const qs=new URL(url).searchParams;
  const kind=(qs.get("kind")||"").replace(/^eq\./,"");
  if(kind===missing)return json([]);
  const count=kind==="clients"?2:kind==="portfolios"?14:151;
  const payload=Array.from({length:count},(_,i)=>({record_id:i+1,data:{value:i}}));
  if(kind===broken)payload.pop();
  return json([{id:"00000000-0000-4000-8000-000000000000",kind,item_count:count,payload,created_at:"2026-11-11T10:00:00Z"}]);
 };
 return {seen,fetcher};
}
Deno.test("dry-run verifies user, downloads only own latest backups with GET and makes zero writes",async()=>{
 const m=mock();
 const result=await dryRunRestore({token:TOKEN,userId:UID,fetcher:m.fetcher});
 checks(result.verified && result.writes===0 && result.categories.length===3,"read-only categories");
 checks(result.categories.map(x=>x.count).join(",")==="2,14,151","count and shape consistency");
 checks(m.seen.length===4,"auth then each backup");
 for(const {url,options} of m.seen){
  checks(options.method==="GET","all requests GET");
  checks(options.credentials==="omit","no cookies");
  checks(options.cache==="no-store","no browser caching");
  checks(options.headers.Authorization==="Bearer "+TOKEN,"auth protected");
  if(url.includes("emlakcrm_user_backups")){
   const params=new URL(url).searchParams;
   checks(params.get("user_id")==="eq."+UID,"only own account");
   checks(params.get("limit")==="1","latest only");
   checks(params.get("select")==="id,kind,item_count,created_at,payload","read only backup content");
  }
 }
});
Deno.test("dry-run fails closed when identity does not match",async()=>{
 const m=mock({uid:"fedcba98-1234-4234-8234-fedcba987654"});
 let denied=false;
 try{await dryRunRestore({token:TOKEN,userId:UID,fetcher:m.fetcher})}catch(e){denied=e.message==="different_account"}
 checks(denied && m.seen.length===1,"no backup reads after mismatched identity");
});
Deno.test("dry-run rejects corrupt payload and never restores it",async()=>{
 const m=mock({broken:"portfolios"});let denied=false;
 try{await dryRunRestore({token:TOKEN,userId:UID,fetcher:m.fetcher})}catch(e){denied=e.message==="invalid_backup_portfolios"}
 checks(denied,"reject mismatching declared item count");
 checks(m.seen.every(x=>x.options.method==="GET"),"no writes even on error");
});
Deno.test("dry-run displays missing categories instead of inventing a backup",async()=>{
 const m=mock({missing:"clients"});
 const result=await dryRunRestore({token:TOKEN,userId:UID,fetcher:m.fetcher});
 checks(result.categories[0].status==="missing"&&result.categories[0].count===null,"missing backup status");
});
Deno.test("no unauthenticated snapshot requests",async()=>{
 const m=mock();
 let denied=false;
 try{await dryRunRestore({token:"",userId:UID,fetcher:m.fetcher})}catch{denied=true}
 checks(denied&&m.seen.length===0,"invalid bearer blocked");
});
