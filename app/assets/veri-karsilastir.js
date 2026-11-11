/**
 * Read-only, account-scoped comparison for the isolated /app/ preview.
 * No create/update/delete/restore and no recording of personal-data payloads.
 */
const API="https://tffvwxskvjuxoekwgdef.supabase.co";
const KEY="sb_publishable_ADLnhwviFBqWtBkq94Adag_ULlAuzUe";
const kinds=[
 {kind:"clients",name:"Müşteriler",key:"emlakcrm_demo_v1__owner_",field:"clients"},
 {kind:"portfolios",name:"Portföyler",key:"emlakcrm_portfoy_rapor_v1__owner_",field:"portfolios"},
 {kind:"external_portfolios",name:"Çekilen portföyler",key:"emlakcrm_external_portfolios_v1__owner_",field:null}
];
const $=id=>document.getElementById(id);
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const isUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
function localCount(spec,uid){
 const raw=localStorage.getItem(spec.key+uid);
 if(raw===null)return 0;
 const obj=parse(raw);
 const a=spec.field?obj?.[spec.field]:obj;
 if(!Array.isArray(a))throw Error("Yerel "+spec.name+" bilgisi okunamadı; işlem durduruldu.");
 return a.length;
}
function status(message,cls=""){
 $("status").textContent=message;$("status").className="notice"+(cls?" "+cls:"");
}
let busy=false;
$("check").addEventListener("click",async()=>{
 if(busy)return;
 busy=true;$("check").disabled=true;$("results").hidden=true;$("rows").replaceChildren();
 status("Giriş hesabı ve kayıt sayıları kontrol ediliyor…");
 try{
  const saved=parse(sessionStorage.getItem("emlakcrm_auth_session_v1")||localStorage.getItem("emlakcrm_auth_remember_v1"));
  if(typeof saved?.access_token!=="string"||saved.access_token.length<16)throw Error("Yeni adreste önce hesabına giriş yap.");
  const headers={apikey:KEY,Authorization:"Bearer "+saved.access_token};
  const check=await fetch(API+"/auth/v1/user",{method:"GET",headers,cache:"no-store",credentials:"omit"});
  if(!check.ok)throw Error("Giriş doğrulanamadı; test uygulamasında tekrar giriş yap.");
  const user=await check.json();
  const uid=String(user?.id||"").toLowerCase();
  if(!isUuid(uid))throw Error("Kullanıcı kimliği doğrulanamadı.");
  const active=localStorage.getItem("emlakcrm_active_account_v1");
  if(active&&active!==uid)throw Error("Bu cihazda başka bir hesabın oturumu işaretli; işlem durduruldu.");
  const output=[];
  for(const spec of kinds){
   const local=localCount(spec,uid);
   const params=new URLSearchParams({select:"kind,item_count,created_at",user_id:"eq."+uid,kind:"eq."+spec.kind,order:"created_at.desc",limit:"1"});
   const response=await fetch(API+"/rest/v1/emlakcrm_user_backups?"+params.toString(),{method:"GET",headers,cache:"no-store",credentials:"omit"});
   if(!response.ok)throw Error(spec.name+" için bulut sayısı alınamadı.");
   const rows=await response.json();
   if(!Array.isArray(rows)||rows.length>1)throw Error("Beklenmeyen bulut verisi.");
   const snapshot=rows[0]||null;
   if(snapshot && (snapshot.kind!==spec.kind||!Number.isSafeInteger(snapshot.item_count)||snapshot.item_count<0))
    throw Error("Bulut yedeği biçiminde sorun var.");
   output.push({name:spec.name,local,remote:snapshot?.item_count??null,date:snapshot?.created_at||null});
  }
  const root=$("rows");root.replaceChildren();
  for(const info of output){
   const line=document.createElement("div");line.className="line";
   const cells=[info.name,info.local,info.remote===null?"Yok":info.remote,
     info.remote===null?"Bulutta yedek yok":info.local===info.remote?"Sayılar eşit":"Sayılar farklı"];
   for(let i=0;i<cells.length;i++){
    const el=document.createElement(i===1||i===2?"strong":"span");
    el.textContent=String(cells[i]);
    if(i===3)el.className=info.remote===info.local?"ok":"diff";
    line.append(el);
   }
   root.append(line);
  }
  $("results").hidden=false;
  const unequal=output.some(x=>x.remote===null||x.remote!==x.local);
  $("summary").textContent=unequal?
   "Yeni alandaki yerel kayıtlar ile son bulut yedekleri farklı. Bu beklenen bir durum olabilir: kayıtlar henüz yeni alan adına taşınmadı. Kayıt ekleme/silme yapma.":
   "Üç kategoride sayı eşleşiyor. Yine de bu sayfa kayıtları geri yüklemedi veya içerik eşitliği denetimi yapmadı.";
  status("Hesap doğrulandı. Veriler değiştirilmeden kayıt sayıları karşılaştırıldı.","success");
 }catch(e){$("results").hidden=true;status(String(e?.message||"Kontrol tamamlanamadı."),"error")}
 finally{busy=false;$("check").disabled=false}
});
