/* EmlakCRM DOMAIN PREVIEW: isolated, authenticated read-only smoke test.
 * No payment, membership change, user creation or CRM server writes here.
 * This preview deliberately keeps the original working application untouched.
 */
(()=>{
 "use strict";
 if(location.origin!=="https://emlkcrm.com.tr" || !location.pathname.startsWith("/app/"))return;
 document.documentElement.dataset.emlakcrmPreview="true";
 const fetchOriginal=window.fetch.bind(window);
 const allowedLogin=(url,method)=> method==="POST" &&
   url==="https://tffvwxskvjuxoekwgdef.supabase.co/auth/v1/token?grant_type=password";
 window.fetch=async function(input,init){
  const url=typeof input==="string"?input:input instanceof URL?input.href:input?.url||"";
  const method=String(init?.method||input?.method||"GET").toUpperCase();
  if(!["GET","HEAD","OPTIONS"].includes(method) && !allowedLogin(url,method))
   throw Error("Test ortamında kayıt, ödeme, abonelik ve şifre değiştirme işlemleri kapalı.");
  return fetchOriginal(input,init);
 };
 // Keep the preview's account login available, but block XMLHttpRequest writes.
 const openOriginal=XMLHttpRequest.prototype.open;
 XMLHttpRequest.prototype.open=function(method,...args){
  this.__previewWrite=!["GET","HEAD","OPTIONS"].includes(String(method).toUpperCase());
  return openOriginal.call(this,method,...args);
 };
 const sendOriginal=XMLHttpRequest.prototype.send;
 XMLHttpRequest.prototype.send=function(...args){
  if(this.__previewWrite)throw Error("Bu önizlemede kayıt değiştirme kapalı.");
  return sendOriginal.apply(this,args);
 };
 if(typeof navigator.sendBeacon==="function")try{
  navigator.sendBeacon=()=>false;
 }catch(_){}
 const addBanner=()=>{
  if(document.getElementById("emlakcrm-staging-banner"))return;
  const banner=document.createElement("aside");
  banner.id="emlakcrm-staging-banner";
  banner.style.cssText="position:sticky;top:0;z-index:2147483647;background:#fff0da;border-bottom:3px solid #df7c19;padding:12px 17px;font:700 14px/1.5 system-ui,sans-serif;color:#54310e;box-shadow:0 4px 12px #0002";
  const text=document.createElement("span");
  text.textContent="🧪 TEST ÖNİZLEMESİ — Gerçek EmlakCRM yayını değildir. Yeni alan adında yalnızca giriş ve görünüm test edilir. Kayıt, ödeme ve üyelik değişiklikleri kapalıdır. Veriler bu adreste henüz geri yüklenmemiş olabilir. ";
  const link=document.createElement("a");
  link.href="https://enginbaysal-oss.github.io/EmlakCRM-Web/";
  link.textContent="Çalışan EmlakCRM'yi aç";
  link.style.cssText="color:#124d70;text-decoration:underline";
  banner.append(text,link);
  document.body.prepend(banner);
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addBanner,{once:true});else addBanner();
 document.addEventListener("click",event=>{
  const a=event.target?.closest?.("a[href]");
  if(!a)return;
  if(/(?:\/app\/abonelik-satin-al\.html|www\.shopier\.com)/i.test(a.href)){
   event.preventDefault();
   alert("Ödeme ve abonelik işlemleri test ortamında kapalıdır. Çalışan EmlakCRM'yi kullanın.");
  }
 },true);
})();
