"use client";

import { useEffect, useRef, useState } from "react";
import OrbitVisual from "./components/OrbitVisual";

const BOT = "https://t.me/Pharmacosmosbot";
function Arrow({ down = false }: { down?: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={down ? "arrow down" : "arrow"}><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Logo() { return <a className="brand" href="#top" aria-label="Pharma Cosmos — bosh sahifa"><svg viewBox="0 0 65 55" aria-hidden="true"><ellipse cx="31" cy="29" rx="29" ry="12" transform="rotate(-35 31 29)" fill="none" stroke="currentColor" strokeWidth="2.5"/><circle cx="51" cy="10" r="6" fill="currentColor"/></svg><span>PHARMA<br/>COSMOS</span></a>; }
function Label({ n, children }: { n: string; children: React.ReactNode }) { return <div className="section-label"><span>{n}</span><i/>{children}</div>; }

const categories = [
  { name: "Dorilar", note: "Kerakli dori haqida — oson so‘rang.", body: "Dori vositasining mavjudligi va uni qaysi filialdan topish mumkinligini Telegram bot yoki call-markaz orqali aniqlang.", cls: "capsule" },
  { name: "Vitaminlar", note: "Kundalik e’tiboringizning bir qismi.", body: "Vitaminlar assortimenti, mavjudligi va yaqin filial haqida ma’lumot olish uchun biz bilan bog‘laning.", cls: "sphere" },
  { name: "Qo‘shimchalar", note: "Tanlov haqida ko‘proq ma’lumot.", body: "Biologik faol qo‘shimchalar assortimenti haqida Telegram bot yoki call-markazdan ma’lumot olishingiz mumkin.", cls: "ring" },
];
const faqs = [
  ["Eng yaqin dorixonani qanday topaman?", "Telegramdagi @Pharmacosmosbot orqali yoki +998 77 277 03 33 raqamiga qo‘ng‘iroq qilib, sizga yaqin filial haqida ma’lumot oling."],
  ["Kecha-kunduz ishlaydigan filiallar bormi?", "Ha, tarmoqda 24/7 ishlaydigan filiallar mavjud. Aniq filial va ish vaqtini call-markaz orqali tekshiring."],
  ["Dori mavjudligini oldindan bilsam bo‘ladimi?", "Albatta. Mahsulot nomini Telegram botga yozing yoki call-markazga ayting. Sizga mavjudlik va filial haqida ma’lumot beriladi."],
  ["Aksiyalar haqida qayerdan bilaman?", "Yangilik va aksiyalarni Instagramdagi @pharmacosmos_uz sahifamiz orqali kuzatib boring."],
];

function FeedbackForm() {
  const [kind, setKind] = useState("feedback");
  const [rating, setRating] = useState(0);
  const [reply, setReply] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const started = useRef(Date.now());
  const id = useRef("");
  const previousPayload = useRef("");
  useEffect(() => { id.current = crypto.randomUUID(); const ctrl = new AbortController(); fetch("/api/feedback", { signal: ctrl.signal }).then(r => r.json()).then(d => setConfigured((d as { configured?: boolean }).configured === true)).catch(() => {}); return () => ctrl.abort(); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form);
    if (configured === false) { setResult({ ok: false, message: "Fikr yuborish xizmati tez orada ishga tushadi. Hozir biz bilan telefon orqali bog‘lanishingiz mumkin." }); return; }
    const payload = { type: kind, branch: data.get("branch"), name: data.get("name"), phone: data.get("phone") || "", rating, message: data.get("message"), wantsReply: reply, website: data.get("website") };
    const fingerprint = JSON.stringify(payload);
    if(previousPayload.current && previousPayload.current !== fingerprint) id.current = crypto.randomUUID();
    previousPayload.current = fingerprint;
    setBusy(true); setResult(null);
    const ctrl = new AbortController(); const timeout = window.setTimeout(() => ctrl.abort(), 20000);
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal, body: JSON.stringify({...payload, submissionId: id.current, startedAt: started.current}) });
      const json = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) throw new Error(json.message || "Xabar yuborilmadi. Iltimos, qayta urinib ko‘ring.");
      setResult({ ok: true, message: "Rahmat! Fikringiz yetkazildi. Sizning e’tiboringiz biz uchun muhim." });
      form.reset(); setRating(0); setReply(false); setKind("feedback"); id.current = crypto.randomUUID(); started.current = Date.now(); previousPayload.current = "";
    } catch (error) { setResult({ ok: false, message: error instanceof Error && error.name !== "AbortError" ? error.message : "Aloqa uzildi. Yozgan fikringiz saqlandi — qayta urinib ko‘ring." }); }
    finally { window.clearTimeout(timeout); setBusy(false); }
  }
  return <form className="feedback-form" onSubmit={submit} aria-label="Mijoz fikri formasi">
    <fieldset className="type-field" disabled={busy}><legend>Murojaatingiz</legend><div className="type-options">{[["feedback","Fikr"],["suggestion","Taklif"],["complaint","Shikoyat"],["thanks","Rahmat"]].map(([value, label]) => <label key={value} className={kind === value ? "selected" : ""}><input type="radio" name="type" value={value} checked={kind === value} onChange={() => setKind(value)} />{label}</label>)}</div></fieldset>
    <label className="field">Qaysi filial?<input name="branch" disabled={busy} required minLength={2} maxLength={160} list="branch-options" placeholder="Filial nomi yoki manzili" autoComplete="off"/><datalist id="branch-options"><option value="Umumiy murojaat"/><option value="Filialni bilmayman"/></datalist></label>
    <div className="form-row"><label className="field">Ismingiz <span>ixtiyoriy</span><input name="name" disabled={busy} maxLength={80} autoComplete="given-name" placeholder="Sizga qanday murojaat qilaylik?"/></label><fieldset className="rating" disabled={busy}><legend>Xizmatni baholang <span>ixtiyoriy</span></legend><div>{[1,2,3,4,5].map(n => <label key={n} className={n <= rating ? "active" : ""}><input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} aria-label={n + " yulduz"} /><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-.9Z"/></svg></label>)}</div>{rating > 0 && <button type="button" className="reset-rating" onClick={() => setRating(0)}>Bekor qilish</button>}</fieldset></div>
    <label className="field">Fikringiz<textarea name="message" disabled={busy} required minLength={10} maxLength={1500} rows={4} placeholder="Nima sizga yoqdi? Nimani yaxshilashimiz mumkin?"/></label>
    <label className="reply-toggle"><input type="checkbox" disabled={busy} checked={reply} onChange={e => setReply(e.target.checked)}/><span>Menga javob berishingizni istayman</span></label>
    {reply && <label className="field phone-field">Telefon raqamingiz<input name="phone" disabled={busy} required type="tel" autoComplete="tel" maxLength={30} placeholder="+998 __ ___ __ __" /></label>}
    <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {configured === false && <p className="form-notice">Onlayn fikr yuborish tez orada ochiladi. Hozircha <a href="tel:+998772770333">+998 77 277 03 33</a> orqali sizni eshitamiz.</p>}
    <button className="button button-orange submit-button" disabled={busy || configured === false} type="submit"><span>{busy ? "Yuborilmoqda…" : configured === false ? "Tez orada ishga tushadi" : "Fikrni yuborish"}</span><Arrow/></button>
    <p className="privacy-note">Fikringiz va kiritgan aloqa ma’lumotlaringiz faqat mas’ul administratorlarga yuboriladi.</p>
    {result && <div className={"form-result " + (result.ok ? "success" : "error")} role={result.ok ? "status" : "alert"}>{result.message}</div>}
  </form>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  useEffect(() => { const observer = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting){e.target.classList.add("in-view");observer.unobserve(e.target);} }),{threshold:.1}); document.querySelectorAll(".reveal").forEach(el => observer.observe(el)); return () => observer.disconnect(); }, []);
  return <>
    <a className="skip-link" href="#content">Asosiy mazmunga o‘tish</a>
    <header className="site-header"><div className="header-inner"><Logo/><nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Asosiy navigatsiya">{[["#company","Kompaniya"],["#categories","Yo‘nalishlar"],["#branches","Filiallar"],["#feedback","Fikr bildirish"]].map(([href,label]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav><a className="header-contact" href="tel:+998772770333">Bog‘lanish <Arrow/></a><button className={"menu-toggle " + (menuOpen ? "open" : "")} aria-expanded={menuOpen} aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"} onClick={() => setMenuOpen(!menuOpen)}><span/><span/></button></div></header>
    <main id="content">
      <section className="hero container" id="top" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow"><i/> DORIXONALAR TARMOG‘I</p><h1 id="hero-title">G‘amxo‘rlik.<br/>Sizga<br/><span>yaqin.</span></h1><p className="hero-description">Dorilar, vitaminlar va biologik<br className="desktop-break"/> faol qo‘shimchalar — bir tarmoqda.</p><div className="hero-actions"><a className="button button-navy" href="#branches">Yaqin dorixonani topish <Arrow/></a><a className="text-link" href="#feedback">Fikr bildirish <Arrow down/></a></div></div>
        <div className="hero-art"><OrbitVisual/><div className="art-caption"><span className="live-dot"/> G‘AMXO‘RLIK ORBITASIDA</div></div>
        <div className="hero-bottom"><div className="hero-stat"><strong>140<span>+</span></strong><p>dorixona.<br/><span>Bitta g‘amxo‘rlik.</span></p></div><div className="hero-bottom-note">Har kuni, siz uchun.<br/><a href="#company">Yaqindan tanishing <Arrow down/></a></div><a href="#company" className="scroll-cue" aria-label="Kompaniya haqida pastga o‘tish"><Arrow down/></a></div>
      </section>
      <section className="company section-pad container" id="company"><Label n="01">BIZ HAQIMIZDA</Label><div className="company-grid reveal"><h2>Har bir murojaat<br/>ortida <span className="serif-accent">inson bor.</span></h2><div className="company-copy"><p className="lead">Biz uchun dorixona — e’tibor va g‘amxo‘rlik uchrashadigan joy.</p><p>Pharma Cosmos dorilar, vitaminlar va biologik faol qo‘shimchalarni birlashtirgan dorixonalar tarmog‘i. Kerakli mahsulot haqida ma’lumot olish va yaqin filialni topish uchun doimo qulay yo‘l bor.</p><a href={BOT} target="_blank" rel="noopener noreferrer" className="text-link">Biz bilan suhbatlashing <Arrow/></a></div></div><div className="values-strip reveal"><span><i/> Sizga yaqin filiallar</span><span><i/> Call-markaz yordami</span><span><i/> Telegram orqali qulay aloqa</span></div></section>
      <section className="categories section-pad container" id="categories"><div className="section-top"><Label n="02">YO‘NALISHLAR</Label><p>Kundalik ehtiyojlar.<br/>E’tiborli tanlov.</p></div><h2 className="reveal">Sizga kerakli<br/><span className="serif-accent">yo‘nalish.</span></h2><div className="category-list">{categories.map((c,i) => <article className={"category reveal " + (activeCategory === i ? "expanded" : "")} key={c.name}><button className="category-toggle" aria-expanded={activeCategory===i} aria-controls={"category-"+i} onClick={() => setActiveCategory(activeCategory===i?null:i)}><span className="category-no">0{i+1}</span><span className="category-title">{c.name}<small>{c.note}</small></span><span className={"material-object "+c.cls} aria-hidden="true"><i/><b/></span><span className="category-arrow"><Arrow/></span></button><div id={"category-"+i} className="category-detail" hidden={activeCategory!==i}><p>{c.body}</p><a className="text-link" href={BOT} target="_blank" rel="noopener noreferrer">Mavjudligini so‘rash <Arrow/></a></div></article>)}</div></section>
      <section className="branches" id="branches"><div className="container branch-grid"><div className="branch-copy reveal"><Label n="03">FILIALLAR</Label><h2>Sizga yaqin.<br/><span className="serif-accent">Kerakli paytda.</span></h2><p>140 dan ortiq dorixonamizdan sizga yaqinini toping. Manzilingizni Telegram botga yozing yoki call-markazimizga qo‘ng‘iroq qiling.</p><a href={BOT} target="_blank" rel="noopener noreferrer" className="button button-navy">Telegram orqali topish <Arrow/></a><a className="branch-phone" href="tel:+998772770333">+998 77 277 03 33 <span>Call-markaz</span></a><p className="branch-note"><span className="live-dot"/> Kecha-kunduz ishlaydigan filiallar mavjud</p></div><div className="branch-art reveal" aria-hidden="true"><div className="branch-orbit orbit-a"/><div className="branch-orbit orbit-b"/><div className="branch-orbit orbit-c"/><span className="branch-node node-a"/><span className="branch-node node-b"/><span className="branch-node node-c"/><div className="branch-center"><span>140+</span><small>g‘amxo‘rlik nuqtasi</small></div><span className="branch-art-label">HAR BIR NUQTADA — E’TIBOR.</span></div></div></section>
      <section className="steps container section-pad"><div className="steps-intro reveal"><Label n="04">OSON VA QULAY</Label><h2>Bir xabardan<br/><span className="serif-accent">boshlanadi.</span></h2></div><ol className="step-list">{[["Botni oching","Telegramda @Pharmacosmosbot orqali suhbatni boshlang."],["Nomini yozing","Sizga kerakli dori yoki mahsulot nomini yuboring."],["Ma’lumot oling","Mavjudligi va uni qaysi filialdan topish haqida so‘rang."]].map(([title,desc],i)=><li className="reveal" key={title}><span>0{i+1}</span><h3>{title}</h3><p>{desc}</p></li>)}</ol></section>
      <section className="feedback" id="feedback"><div className="container feedback-grid"><div className="feedback-copy reveal"><Label n="05">MIJOZ OVOZI</Label><h2>Fikringiz<br/><span>muhim.</span></h2><p className="feedback-lead">Yaxshi xizmat<br/>tinglashdan boshlanadi.</p><p>Taklif, savol yoki shunchaki rahmat — har bir murojaatingizni qadrlaymiz.</p><div className="feedback-orbit" aria-hidden="true"><i/><b/></div><span className="feedback-small">SIZNI ESHITAMIZ.</span></div><FeedbackForm/></div></section>
      <section className="faq container section-pad" id="questions"><div className="faq-heading reveal"><Label n="06">SAVOL VA JAVOB</Label><h2>Bilishni<br/><span className="serif-accent">istaysizmi?</span></h2><p>Yana savolingiz bormi?<br/><a href="tel:+998772770333">Bizga qo‘ng‘iroq qiling <Arrow/></a></p></div><div className="faq-list">{faqs.map(([question,answer],i)=><article className={"faq-item "+(activeFaq===i?"active":"")} key={question}><h3><button aria-expanded={activeFaq===i} aria-controls={"faq-"+i} onClick={()=>setActiveFaq(activeFaq===i?null:i)}>{question}<span aria-hidden="true">{activeFaq===i?"−":"+"}</span></button></h3><div id={"faq-"+i} hidden={activeFaq!==i}><p>{answer}</p></div></article>)}</div></section>
      <section className="closing container reveal"><span className="closing-dot"/><p>Sizga yaqin.<br/><strong>Har kuni.</strong></p><a href="tel:+998772770333" className="closing-phone">Gaplashamizmi?<span>+998 77 277 03 33 <Arrow/></span></a></section>
    </main>
    <footer className="site-footer container"><div className="footer-top"><Logo/><div className="footer-links"><a href={BOT} target="_blank" rel="noopener noreferrer">Telegram <Arrow/></a><a href="https://instagram.com/pharmacosmos_uz" target="_blank" rel="noopener noreferrer">Instagram <Arrow/></a><a href="https://youtube.com/@pharmacosmosuz" target="_blank" rel="noopener noreferrer">YouTube <Arrow/></a></div><a className="back-top" href="#top">Yuqoriga <Arrow/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Pharma Cosmos</span><span>Dorixonalar tarmog‘i. G‘amxo‘rlik orbitasida.</span></div></footer>
    <div className="mobile-actions"><a href="tel:+998772770333">Qo‘ng‘iroq qilish <Arrow/></a><a href="#feedback">Fikr bildirish <Arrow down/></a></div>
  </>;
}
