import {readCloudBackupOverview} from "../emlakcrm-cloud-restore-preview.js";

const API="https://tffvwxskvjuxoekwgdef.supabase.co";
const KEY="sb_publishable_ADLnhwviFBqWtBkq94Adag_ULlAuzUe";
const $=id=>document.getElementById(id);
const status=$("status");
const check=$("check");
const form=$("testForm");
let busy=false;

function notify(message,kind=""){
 status.textContent=message;
 status.className="notice"+(kind?" "+kind:"");
}
function clearResults(){
 $("results").hidden=true;
 $("backupGrid").replaceChildren();
}
function cleanup(){
 $("email").value="";
 $("password").value="";
 clearResults();
 notify("Test bilgileri ekrandan temizlendi. Oturum saklanmadı.","success");
}
$("clear").addEventListener("click",()=>{
 // Reload to clear any transient JS memory, without clearing production browser data.
 window.location.replace("./hesap-testi.html?temiz=1");
});
window.addEventListener("pageshow",e=>{
 // Avoid showing previously verified customer metadata from back/forward cache.
 if(e.persisted)window.location.reload();
});

function friendlyError(code){
 switch(code){
  case "invalid_credentials":return "E-posta veya şifre doğrulanamadı. Mevcut EmlakCRM uygulamanızdaki giriş bilgilerinizi kontrol edin.";
  case "too_many_attempts":return "Çok sayıda deneme nedeniyle geçici hız sınırı var. Bir süre sonra tekrar deneyin.";
  case "backup_list_unavailable":return "Hesap doğrulandı ancak bulut yedek listesi okunamadı. Hiçbir veri değiştirilmedi.";
  case "different_account_verified":return "Hesap kimliği uyuşmuyor. Güvenlik nedeniyle işlem durduruldu.";
  default:return "Kontrol tamamlanamadı. İnternet bağlantısını veya hesap bilgilerini kontrol edin. Veri değiştirilmedi.";
 }
}

form.addEventListener("submit",async event=>{
 event.preventDefault();
 if(busy)return;
 const email=$("email").value.trim();
 let password=$("password").value;
 if(!email||!password)return;
 clearResults();
 $("password").value="";
 busy=true;
 check.disabled=true;
 check.textContent="Doğrulanıyor…";
 notify("Hesabınız doğrulanıyor ve yalnızca yedek kayıt sayıları okunuyor.");
 let session=null;
 try{
  const auth=await fetch(API+"/auth/v1/token?grant_type=password",{
   method:"POST",mode:"cors",credentials:"omit",cache:"no-store",
   headers:{apikey:KEY,"content-type":"application/json"},
   body:JSON.stringify({email,password})
  });
  password="";
  if(!auth.ok){
   if(auth.status===400||auth.status===401)throw Error("invalid_credentials");
   if(auth.status===429)throw Error("too_many_attempts");
   throw Error("auth_unavailable");
  }
  const authData=await auth.json();
  session={access_token:String(authData?.access_token||"")};
  const uid=String(authData?.user?.id||"").toLowerCase();
  if(!session.access_token||!uid)throw Error("auth_unavailable");
  const overview=await readCloudBackupOverview({
   session,expectedAccountId:uid,activeAccountId:uid
  });
  if(!overview.userVerified)throw Error("account_verification_failed");
  const grid=$("backupGrid");
  grid.replaceChildren();
  for(const item of overview.backups){
   const card=document.createElement("article");
   card.className="item";
   const title=document.createElement("h3");
   title.textContent=item.label;
   const count=document.createElement("strong");
   count.textContent=item.available?(item.itemCount===null?"—":String(item.itemCount)):"Yok";
   const date=document.createElement("small");
   date.textContent=item.latest?"Son yedek: "+new Date(item.latest).toLocaleString("tr-TR"):"Bulut yedeği bulunamadı";
   card.append(title,count,date);
   grid.append(card);
  }
  $("results").hidden=false;
  notify("✓ Hesap doğrulandı. Yalnızca size ait yedeklerin kayıt sayısı ve tarihi okundu.","success");
 }catch(error){
  clearResults();
  notify("⚠️ "+friendlyError(error?.message||""),"error");
 }finally{
  password="";
  session=null;
  busy=false;
  check.disabled=false;
  check.textContent="Hesabımı ve Yedekleri Kontrol Et";
  $("password").value="";
 }
});
