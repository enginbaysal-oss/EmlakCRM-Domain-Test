import {dryRunRestore} from "./yedek-prova-kontrol.js";
const API="https://tffvwxskvjuxoekwgdef.supabase.co";
const KEY="sb_publishable_ADLnhwviFBqWtBkq94Adag_ULlAuzUe";
const $=id=>document.getElementById(id);
const form=$("testForm");
const start=$("start");
let busy=false;
function status(message,klass=""){
 const el=$("status");
 el.textContent=message;
 el.className="notice"+(klass?" "+klass:"");
}
function resetResults(){
 $("result").hidden=true;
 $("cards").replaceChildren();
}
$("clean").addEventListener("click",()=>window.location.replace("./yedek-prova.html?temiz=1"));
window.addEventListener("pageshow",event=>{if(event.persisted)window.location.reload()});
function messageFor(error){
 const code=error?.message||"";
 if(code==="invalid_credentials")return "Giriş bilgileri doğrulanamadı.";
 if(code==="identity_check_failed"||code==="different_account")return "Hesap güvenliği doğrulanamadı. İşlem durduruldu.";
 if(code.startsWith("invalid_backup_"))return "Yedeklerden birinin yapısında uyumsuzluk bulundu. Gerçek taşıma yapılmamalı.";
 if(code==="backup_read_failed")return "Hesap doğrulandı ancak bulut yedeği okunamadı. Hiçbir veri değiştirilmedi.";
 return "Güvenli kuru prova tamamlanamadı. Hiçbir kayıt değiştirilmedi.";
}
form.addEventListener("submit",async event=>{
 event.preventDefault();
 if(busy)return;
 const email=$("email").value.trim();
 let password=$("password").value;
 if(!email||!password)return;
 $("password").value="";
 resetResults();
 busy=true;
 start.disabled=true;
 start.textContent="Yedekler kontrol ediliyor…";
 status("Kimlik doğrulanıyor ve son yedekler geçici bellekte kontrol ediliyor…");
 let token=null;
 try{
  const res=await fetch(API+"/auth/v1/token?grant_type=password",{
   method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
   headers:{apikey:KEY,"Content-Type":"application/json"},
   body:JSON.stringify({email,password})
  });
  password="";
  if(!res.ok)throw Error(res.status===400||res.status===401?"invalid_credentials":"auth_unavailable");
  const data=await res.json();
  token=String(data?.access_token||"");
  const uid=String(data?.user?.id||"");
  const result=await dryRunRestore({token,userId:uid});
  if(!result.verified||result.writes!==0)throw Error("not_read_only");
  const root=$("cards");
  root.replaceChildren();
  for(const entry of result.categories){
   const card=document.createElement("div");card.className="entry";
   const title=document.createElement("h3");title.textContent=entry.label;
   const count=document.createElement("strong");count.textContent=entry.status==="ready"?String(entry.count):"Yedek yok";
   const date=document.createElement("small");date.textContent=entry.createdAt?"Son yedek: "+new Date(entry.createdAt).toLocaleString("tr-TR"):"Bulut kaydı bulunamadı";
   card.append(title,count,date);root.append(card);
  }
  $("result").hidden=false;
  const missing=result.categories.some(item=>item.status!=="ready");
  status(missing?"Kuru prova tamamlandı; bazı yedekler eksik. Taşıma için önce yedekleri tamamlayın.":"✓ Üç yedek okundu, yapıları doğrulandı. Hiçbir kayıt değiştirilmedi.",missing?"danger":"success");
 }catch(error){
  resetResults();
  status("⚠️ "+messageFor(error),"danger");
 }finally{
  token=null;
  password="";
  $("password").value="";
  busy=false;
  start.disabled=false;
  start.textContent="Yedeği Kuru Provada Kontrol Et";
 }
});