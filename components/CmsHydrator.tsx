'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cmsCollections, getPublishedByField, getPublishedCollection, getDocById } from '@/lib/cms';

type Page = 'home'|'microgreens'|'product'|'journey'|'contact'|'account'|'cart'|'checkout'|'success';
const text = (el: Element | null, value: unknown) => { if (el && typeof value === 'string' && value.trim()) el.textContent = value; };
const attr = (el: Element | null, name: string, value: unknown) => { if (el && typeof value === 'string' && value.trim()) el.setAttribute(name, value); };
const image = (el: Element | null, value: unknown) => { if (el && typeof value === 'string' && value.trim()) attr(el, 'src', value); };
const applySeo = (title: unknown, description: unknown) => {
  if (typeof title === 'string' && title.trim()) document.title = title.trim();
  if (typeof description === 'string' && description.trim()) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description.trim();
  }
};
const esc = (value: unknown) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');

function applyNavigation(root: HTMLElement, items: Array<Record<string, unknown>>) {
  const byKey = new Map(items.map((x) => [String(x.navKey ?? ''), x]));
  const map: Array<[string, string]> = [
    ['home','Home'], ['microgreens','Microgreens'], ['journey','Journey'], ['contact','Contact'], ['account','Account'], ['cart','Cart'], ['shopCta','Shop Fresh'],
    ['footerMicrogreens','Microgreens'], ['footerJourney','Our Journey'], ['footerContact','Contact'], ['footerAccount','My Account']
  ];
  const nav = root.querySelector('.nav');
  const footer = root.querySelector('.footer');
  for (const [key, fallback] of map) {
    const item = byKey.get(key);
    const label = String(item?.label ?? fallback);
    const links = Array.from((key.startsWith('footer') ? footer : nav)?.querySelectorAll('a') ?? []);
    const link = links.find((a) => (a.textContent ?? '').replace(/\s+/g,' ').trim().replace(/^Cart\s*0$/,'Cart') === fallback || (a.textContent ?? '').trim() === label);
    if (link) text(link, key === 'cart' ? `${label} 0` : label);
  }
}

async function applyCommon(root: HTMLElement) {
  const [nav, settings] = await Promise.all([
    getPublishedCollection<Record<string, unknown>>(cmsCollections.navigation),
    getDocById<Record<string, unknown>>(cmsCollections.siteSettings, 'site'),
  ]);
  applyNavigation(root, nav);
  if (settings) {
    text(root.querySelector('.footer-bottom span:first-child'), `© 2026 ${String(settings.siteName ?? '')}`.trim());
    text(root.querySelector('.footer-bottom span:last-child'), settings.tagline);
    const contactLinks = Array.from(root.querySelectorAll('.footer a'));
    const phone = String(settings.contactPhone ?? '').trim();
    const email = String(settings.contactEmail ?? '').trim();
    for (const a of contactLinks) {
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('tel:') && phone) { text(a, phone); attr(a, 'href', `tel:${phone.replace(/\s+/g,'')}`); }
      if (href.startsWith('mailto:') && email) { text(a, email); attr(a, 'href', `mailto:${email}`); }
    }
    const brand = root.querySelector('.brand');
    if (brand) text(brand.querySelector('span:last-child'), settings.siteName);
    const logo = String(settings.logoUrl ?? '').trim();
    if (logo) {
      const img = brand?.querySelector('img');
      if (img) attr(img, 'src', logo);
    }
  }
}

async function applyHome(root: HTMLElement) {
  const [hero, home, trust, testimonials, faq] = await Promise.all([
    getPublishedCollection<Record<string, unknown>>(cmsCollections.heroSlider),
    getPublishedCollection<Record<string, unknown>>(cmsCollections.homepageContent),
    getPublishedCollection<Record<string, unknown>>(cmsCollections.trustPoints),
    getPublishedCollection<Record<string, unknown>>(cmsCollections.testimonials),
    getPublishedCollection<Record<string, unknown>>(cmsCollections.faq),
  ]);
  const firstHero = [...hero].sort((a,b)=>Number(a.sortOrder??0)-Number(b.sortOrder??0))[0];
  if (firstHero) {
    text(root.querySelector('.hero .eyebrow'), firstHero.eyebrow);
    const h1 = root.querySelector('.hero h1');
    if (h1 && typeof firstHero.title === 'string') h1.textContent = firstHero.title;
    text(root.querySelector('.hero p'), firstHero.subtitle);
    text(root.querySelector('.hero .primary'), firstHero.primaryButtonText);
    attr(root.querySelector('.hero .primary'), 'href', firstHero.primaryButtonUrl);
    text(root.querySelector('.hero .secondary'), firstHero.secondaryButtonText);
    attr(root.querySelector('.hero .secondary'), 'href', firstHero.secondaryButtonUrl);
    const art = root.querySelector('.hero-art') as HTMLElement | null;
    if (art && typeof firstHero.imageUrl === 'string' && firstHero.imageUrl.trim()) { art.style.backgroundImage = `url(${firstHero.imageUrl})`; art.style.backgroundSize = 'cover'; art.style.backgroundPosition = 'center'; }
  }
  const byKey = new Map(home.map(x=>[String(x.key??''),x]));
  const promise = byKey.get('promise');
  if (promise) {
    const s=root.querySelector('.promo'); text(s?.querySelector('.eyebrow'),promise.eyebrow); text(s?.querySelector('h2'),promise.title); text(s?.querySelector('p'),promise.body); text(s?.querySelector('a'),promise.buttonText); attr(s?.querySelector('a'),'href',promise.buttonUrl);
    const pills=Array.from(s?.querySelectorAll('.promo-pill')??[]); [[promise.freshTitle,promise.freshText],[promise.localTitle,promise.localText],[promise.simpleTitle,promise.simpleText]].forEach((v,i)=>{text(pills[i]?.querySelector('strong'),v[0]);text(pills[i]?.querySelector('span'),v[1]);});
  }
  const why=byKey.get('why'); const split=root.querySelector('.split');
  if(why&&split){text(split.querySelector('.eyebrow'),why.eyebrow);text(split.querySelector('h2'),why.title);text(split.querySelector('p.muted'),why.body);const fs=Array.from(split.querySelectorAll('.feature'));[[why.feature1Title,why.feature1Text],[why.feature2Title,why.feature2Text],[why.feature3Title,why.feature3Text]].forEach((v,i)=>{text(fs[i]?.querySelector('h3'),v[0]);text(fs[i]?.querySelector('p'),v[1]);});text(split.querySelector('a'),why.buttonText);attr(split.querySelector('a'),'href',why.buttonUrl);}
  const app=byKey.get('appBanner'); const banner=root.querySelector('.banner'); if(app&&banner){text(banner.querySelector('.eyebrow'),app.eyebrow);text(banner.querySelector('h2'),app.title);text(banner.querySelector('p'),app.body);const stores=Array.from(banner.querySelectorAll('.store'));attr(stores[0],'href',app.googlePlayUrl);attr(stores[1],'href',app.appStoreUrl);}
  const trustMap=new Map(trust.map(x=>[String(x.itemKey??''),x])); const trustEls=Array.from(root.querySelectorAll('.trust-grid>div')); ['fresh','seed','water','ordering'].forEach((k,i)=>{const x=trustMap.get(k);if(x){text(trustEls[i]?.querySelector('strong'),x.title);text(trustEls[i]?.querySelector('span'),x.text);}});
  if(testimonials.length){const track=root.querySelector('.testimonial')?.parentElement;if(track){track.innerHTML=testimonials.slice().sort((a,b)=>Number(a.sortOrder??0)-Number(b.sortOrder??0)).map(x=>`<article class="testimonial"><div class="stars">${'★'.repeat(Math.max(0,Math.min(5,Number(x.rating??0))))}</div><p class="quote">“${esc(x.content)}”</p><div class="person"><span class="avatar">${String(x.customerName??'?').trim().charAt(0).toUpperCase()}</span><span><strong>${esc(x.customerName)}</strong><br><small class="muted">Seedlings customer</small></span></div></article>`).join('');}}
  if(faq.length){const box=root.querySelector('.faq');if(box){box.innerHTML=faq.slice().sort((a,b)=>Number(a.sortOrder??0)-Number(b.sortOrder??0)).map(x=>`<div class="faq-item"><button class="faq-q">${esc(x.question)}<span class="faq-plus">＋</span></button><div class="faq-a">${esc(x.answer)}</div></div>`).join('');}}
}

async function applyPage(root: HTMLElement, page: Page) {
  if (page === 'home') return applyHome(root);
  if (page === 'microgreens') {
    const rows=await getPublishedByField<Record<string,unknown>>(cmsCollections.websitePages,'pageKey','microgreens'); const x=rows[0]; if(!x)return;
    text(root.querySelector('.page-hero h1'),x.title);text(root.querySelector('.page-hero p'),x.body);image(root.querySelector('.page-hero img'),x.imageUrl);applySeo(x.seoTitle,x.seoDescription); const mood=root.querySelectorAll('.section')[0];text(mood?.querySelector('.eyebrow'),x.moodEyebrow);text(mood?.querySelector('h2'),x.moodTitle);const cards=Array.from(mood?.querySelectorAll('.card')??[]);[[x.everydayTitle,x.everydayText],[x.colourTitle,x.colourText],[x.chefTitle,x.chefText]].forEach((v,i)=>{text(cards[i]?.querySelector('h3'),v[0]);text(cards[i]?.querySelector('p'),v[1]);}); return;
  }
  if (page === 'journey') {
    const [hero,spark,process]=await Promise.all([getPublishedByField<Record<string,unknown>>(cmsCollections.journey,'blockKey','hero'),getPublishedByField<Record<string,unknown>>(cmsCollections.journey,'blockKey','spark'),getPublishedByField<Record<string,unknown>>(cmsCollections.journey,'blockKey','process')]);
    const h=hero[0],s=spark[0],p=process[0]; if(h){text(root.querySelector('.page-hero h1'),h.title);text(root.querySelector('.page-hero p'),h.body);image(root.querySelector('.page-hero img'),h.imageUrl);} const split=root.querySelector('.split');if(s&&split){text(split.querySelector('.eyebrow'),s.eyebrow);text(split.querySelector('h2'),s.title);const ps=split.querySelectorAll('p.muted');text(ps[0],s.paragraph1);text(ps[1],s.paragraph2);const fs=split.querySelectorAll('.feature');text(fs[0]?.querySelector('h3'),s.chooseTitle);text(fs[0]?.querySelector('p'),s.chooseText);text(fs[1]?.querySelector('h3'),s.growTitle);text(fs[1]?.querySelector('p'),s.growText);} const center=root.querySelectorAll('.center')[0];if(p&&center){text(center.querySelector('.eyebrow'),p.eyebrow);text(center.querySelector('h2'),p.title);text(center.querySelector('p.muted'),p.body);const steps=root.querySelectorAll('.step');[[p.seedTitle,p.seedText],[p.growTitle,p.growText],[p.harvestTitle,p.harvestText],[p.deliverTitle,p.deliverText]].forEach((v,i)=>{text(steps[i]?.querySelector('h3'),v[0]);text(steps[i]?.querySelector('p'),v[1]);});} return;
  }
  if (page === 'contact') { const rows=await getPublishedByField<Record<string,unknown>>(cmsCollections.websitePages,'pageKey','contact');const x=rows[0];if(!x)return;text(root.querySelector('.page-hero h1'),x.title);text(root.querySelector('.page-hero p'),x.body);image(root.querySelector('.page-hero img'),x.imageUrl);applySeo(x.seoTitle,x.seoDescription);const g=root.querySelector('.contact-grid');if(g){text(g.querySelector('.eyebrow'),x.eyebrow);text(g.querySelector('h2'),x.title);const fs=g.querySelectorAll('.feature');[[x.callTitle,x.callText],[x.emailTitle,x.emailText],[x.serviceTitle,x.serviceText]].forEach((v,i)=>{text(fs[i]?.querySelector('h3'),v[0]);text(fs[i]?.querySelector('p'),v[1]);});} }
}

export default function CmsHydrator({ page, children }: { page: Page; children: ReactNode }) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const root=ref.current;if(!root)return;void (async()=>{try{await applyCommon(root);await applyPage(root,page);}catch(e){console.error('CMS content load failed',e);}})();},[page]);
  return <div ref={ref}>{children}</div>;
}
