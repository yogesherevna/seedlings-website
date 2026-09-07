
const menu=document.querySelector('.menu'),nav=document.querySelector('.nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));

document.querySelectorAll('.carousel').forEach(c=>{
  const track=c.querySelector('.carousel-track'), prev=c.querySelector('.carousel-prev'), next=c.querySelector('.carousel-next');
  prev?.addEventListener('click',()=>track.scrollBy({left:-track.clientWidth*.85,behavior:'smooth'}));
  next?.addEventListener('click',()=>track.scrollBy({left:track.clientWidth*.85,behavior:'smooth'}));
  if(c.dataset.autoplay==="true"){setInterval(()=>{if(track.scrollLeft+track.clientWidth>=track.scrollWidth-5) track.scrollTo({left:0,behavior:'smooth'}); else track.scrollBy({left:track.clientWidth*.85,behavior:'smooth'})},4500)}
});
document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));
document.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const el=document.querySelector(b.dataset.minus);let n=Math.max(1,Number(el.textContent)-1);el.textContent=n});
document.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const el=document.querySelector(b.dataset.plus);el.textContent=Number(el.textContent)+1});
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
document.querySelectorAll('[data-demo-link]').forEach(a=>a.addEventListener('click',e=>{if(a.tagName==='A')e.preventDefault();alert('Prototype action — connect this screen to Firebase during migration.')}));

document.querySelectorAll('.mode-option').forEach(o=>o.addEventListener('click',()=>{
 document.querySelectorAll('.mode-option').forEach(x=>x.classList.remove('selected')); o.classList.add('selected');
 const picker=document.querySelector('.subscription-picker'); if(picker) picker.style.display=o.querySelector('strong')?.textContent==='Subscribe'?'block':'none';
}));
document.querySelectorAll('[data-demo-action]').forEach(b=>b.addEventListener('click',()=>{
 const action=b.dataset.demoAction; alert(action==='skip'?'Prototype: the next delivery would be marked Skipped.':'Prototype: choose a new Saturday and the next delivery would be marked Rescheduled.');
}));
