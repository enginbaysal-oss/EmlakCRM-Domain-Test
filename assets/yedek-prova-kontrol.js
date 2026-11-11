/**
 * EmlakCRM's safe *dry-run* cloud restore.
 * Reads authenticated user-owned backup snapshots into transient memory,
 * validates their structure and simulates JSON deserialization.
 * NEVER writes to localStorage, sessionStorage, cookies or a database.
 * NEVER logs customer records or returns snapshot payloads.
 */
export const KINDS=Object.freeze([
 {kind:"clients",label:"Müşteri",limit:20000},
 {kind:"portfolios",label:"Portföy",limit:20000},
 {kind:"external_portfolios",label:"Çekilen portföy",limit:1000}
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const API="https://tffvwxskvjuxoekwgdef.supabase.co";
const KEY="sb_publishable_ADLnhwviFBqWtBkq94Adag_ULlAuzUe";
const fail=(reason)=>{throw Error(reason)};
const validToken=token=>typeof token==="string" && token.length>16 && token.length<8192 && /^[a-zA-Z0-9._~-]+$/.test(token);

/**
 * @param {{
 *   token:string,
 *   userId:string,
 *   fetcher?:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>,
 *   baseUrl?:string,
 *   publishableKey?:string,
 * }} args
 * @returns {Promise<{verified:boolean, writes:number, categories:Array<{kind:string,label:string,status:string,count:number|null,createdAt:string|null}>}>}
 */
export async function dryRunRestore({token,userId,fetcher=fetch,baseUrl=API,publishableKey=KEY}){
 const uid=String(userId||"").toLowerCase();
 if(!UUID.test(uid)||!validToken(token))fail("invalid_session");
 const headers={apikey:publishableKey,Authorization:"Bearer "+token};
 const verified=await fetcher(baseUrl+"/auth/v1/user",{
  method:"GET",headers,cache:"no-store",credentials:"omit"
 });
 if(!verified.ok)fail("identity_check_failed");
 const user=await verified.json();
 if(String(user?.id||"").toLowerCase()!==uid)fail("different_account");
 const categories=[];
 for(const spec of KINDS){
  const params=new URLSearchParams({
   select:"id,kind,item_count,created_at,payload",
   user_id:"eq."+uid,
   kind:"eq."+spec.kind,
   order:"created_at.desc",
   limit:"1"
  });
  const reply=await fetcher(baseUrl+"/rest/v1/emlakcrm_user_backups?"+params.toString(),{
   method:"GET",headers,cache:"no-store",credentials:"omit"
  });
  if(!reply.ok)fail("backup_read_failed");
  const rows=await reply.json();
  if(!Array.isArray(rows)||rows.length>1)fail("invalid_backup_response");
  const row=rows[0];
  if(!row){
   categories.push({kind:spec.kind,label:spec.label,status:"missing",count:null,createdAt:null});
   continue;
  }
  if(row.kind!==spec.kind||!Array.isArray(row.payload)||
     !Number.isSafeInteger(row.item_count)||row.item_count<0 ||
     row.item_count!==row.payload.length || row.payload.length>spec.limit)
    fail("invalid_backup_"+spec.kind);
  // This confirms JSON is rehydratable and all entries remain structured objects.
  // The transient copy is discarded immediately; there are NO persistent writes.
  let copy;
  try{copy=JSON.parse(JSON.stringify(row.payload))}
  catch{fail("invalid_backup_"+spec.kind)}
  if(!Array.isArray(copy)||copy.length!==row.item_count||
     copy.some(value=>value===null||typeof value!=="object"||Array.isArray(value)))
    fail("invalid_backup_"+spec.kind);
  categories.push({
   kind:spec.kind,label:spec.label,status:"ready",
   count:copy.length,
   createdAt:typeof row.created_at==="string" && Number.isFinite(Date.parse(row.created_at))?row.created_at:null
  });
  copy=null;
 }
 return {verified:true,writes:0,categories};
}
