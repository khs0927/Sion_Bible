(() => {
  const style = document.createElement('style');
  style.textContent = `
    body.sion-saved-screen main, body.sion-saved-screen main *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    body.sion-saved-screen input, body.sion-saved-screen textarea{-webkit-user-select:text;user-select:text}
    .sion-sort-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(35,29,24,.34);backdrop-filter:blur(4px)}
    .sion-sort-sheet{width:min(100%,430px);max-height:82vh;overflow:auto;border:1px solid #E4D8CA;border-radius:24px;background:#FFFCF7;box-shadow:0 18px 44px rgba(52,45,39,.18);padding:16px;color:#342D27;font-family:'S-Core Dream',Pretendard,system-ui,sans-serif}
    .sion-sort-title{font-weight:900;font-size:18px;margin-bottom:4px}.sion-sort-subtitle{color:#756B61;font-size:12px;line-height:1.55;margin-bottom:12px}.sion-sort-grid{display:grid;gap:8px}
    .sion-sort-option{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;border:1px solid #E4D8CA;border-radius:16px;background:#F8F3EC;color:#342D27;padding:12px 13px;font:inherit;font-weight:850;text-align:left}.sion-sort-option small{display:block;margin-top:3px;color:#756B61;font-size:11px;font-weight:700;line-height:1.4}.sion-sort-option[data-active=true]{border-color:rgba(111,143,114,.42);background:linear-gradient(145deg,#6F8F72,#86B7AD);color:#fff}.sion-sort-option[data-active=true] small{color:rgba(255,255,255,.86)}.sion-sort-close{width:100%;margin-top:10px;border:1px solid #E4D8CA;border-radius:15px;background:#fff;color:#756B61;padding:11px;font:inherit;font-weight:900}
    .sion-inline-action{display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:6px 9px;border:1px solid #E4D8CA;border-radius:11px;background:#fff;color:#756B61;font-family:inherit;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 6px 12px rgba(52,45,39,.05)}.sion-inline-action.primary{color:#fff;border-color:transparent;background:linear-gradient(145deg,#6F8F72,#86B7AD)}
    .sion-card-actions{margin-left:auto;display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;flex:0 0 auto}.sion-card-copy,.sion-card-check{width:30px;height:30px;min-height:30px;padding:0;border-radius:11px;flex:0 0 auto;line-height:1}.sion-card-copy svg,.sion-card-check svg{width:15px;height:15px;display:block}.sion-card-check[data-checked=false]{background:#fff;color:transparent;border-color:#E4D8CA}.sion-card-check[data-checked=true]{color:#fff;border-color:transparent;background:linear-gradient(145deg,#6F8F72,#86B7AD)}
    .sion-saved-card-selected{background:rgba(111,143,114,.12)!important;border-color:rgba(111,143,114,.72)!important;box-shadow:0 10px 22px rgba(111,143,114,.14)!important}
    .sion-bulk-copy-bar{position:fixed;left:12px;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:10001;display:flex;justify-content:center;pointer-events:none}.sion-bulk-copy-inner{width:min(100%,420px);display:grid;grid-template-columns:1fr 92px;gap:8px;padding:10px;border:1px solid #E4D8CA;border-radius:18px;background:rgba(255,252,247,.96);box-shadow:0 14px 34px rgba(52,45,39,.16);pointer-events:auto}
  `;
  document.head.appendChild(style);

  const SAVED_KEY='gb_saved', SORT_KEY='savedVerseSortMode', REOPEN_KEY='sion_saved_reopen', MODE_KEY='sion_saved_group_mode';
  const BOOK_ORDER=['창세기','출애굽기','레위기','민수기','신명기','여호수아','사사기','룻기','사무엘상','사무엘하','열왕기상','열왕기하','역대상','역대하','에스라','느헤미야','에스더','욥기','시편','잠언','전도서','아가','이사야','예레미야','예레미야애가','에스겔','다니엘','호세아','요엘','아모스','오바댜','요나','미가','나훔','하박국','스바냐','학개','스가랴','말라기','마태복음','마가복음','누가복음','요한복음','사도행전','로마서','고린도전서','고린도후서','갈라디아서','에베소서','빌립보서','골로새서','데살로니가전서','데살로니가후서','디모데전서','디모데후서','디도서','빌레몬서','히브리서','야고보서','베드로전서','베드로후서','요한일서','요한이서','요한삼서','유다서','요한계시록'];
  const SORT_OPTIONS=[['manual','현재 수동 순서','화면에 저장된 지금 순서를 유지합니다.'],['originalAsc','원래 추가한 순서','처음 저장했던 순서로 되돌립니다.'],['addedNewest','추가한 순서 최신순','최근 추가한 말씀이 위로 옵니다.'],['addedOldest','추가한 순서 오래된순','처음 추가한 말씀이 위로 옵니다.'],['dateDesc','날짜순 내림차순','최신 날짜부터 보여줍니다.'],['dateAsc','날짜순 오름차순','오래된 날짜부터 보여줍니다.'],['bibleOrder','권별 순서','성경 66권, 장, 절 순서로 정렬합니다.'],['dateDescBible','날짜 안에서 권별 최신순','최신 날짜 안에서 성경 순서로 정렬합니다.'],['dateAscBible','날짜 안에서 권별 오래된순','오래된 날짜 안에서 성경 순서로 정렬합니다.']];
  const COPY_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  const CHECK_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  let bulkCopyMode=false;
  const selectedRefs=new Set();

  const readSaved=()=>{try{return JSON.parse(localStorage.getItem(SAVED_KEY)||'[]')}catch{return[]}};
  const writeSaved=(items)=>localStorage.setItem(SAVED_KEY,JSON.stringify(items));
  const savedTime=(item)=>{const t=item?.date?new Date(item.date).getTime():0;return Number.isNaN(t)?0:t};
  const dayTime=(value)=>{const d=value?new Date(value):new Date(0);if(Number.isNaN(d.getTime()))return 0;d.setHours(0,0,0,0);return d.getTime()};
  const parseRef=(ref='')=>{const m=String(ref).match(/^(.+?)\s+(\d+):(\d+)/);return m?{book:m[1],chapter:+m[2]||0,verse:+m[3]||0}:{book:'',chapter:0,verse:0}};
  const bibleOrderValue=(item)=>{const p=parseRef(item?.ref);const i=BOOK_ORDER.indexOf(p.book);return (i<0?999:i)*1000000+p.chapter*1000+p.verse};
  const isSavedScreen=()=>document.body.innerText.includes('저장한 말씀')||document.body.innerText.includes('다시 읽는 말씀');
  const findButtonByText=(text)=>[...document.querySelectorAll('button')].find(b=>b.textContent?.trim().includes(text));
  const closeSortSheet=()=>document.querySelector('.sion-sort-backdrop')?.remove();

  function normalizeSavedOrders(){
    const items=readSaved(); if(!Array.isArray(items)||!items.length)return items;
    let changed=false; const existing=items.map(i=>Number(i?.originalOrder)).filter(Number.isFinite);
    let nextFront=existing.length?Math.min(...existing)-1:0, nextBack=existing.length?Math.max(...existing)+1:0;
    const normalized=items.map((item,index)=>{if(Number.isFinite(Number(item?.originalOrder)))return item;changed=true;return{...item,originalOrder:index===0&&existing.length?nextFront--:nextBack++}});
    if(changed)writeSaved(normalized); return normalized;
  }
  function sortSaved(mode){
    const sorted=[...(normalizeSavedOrders()||[])];
    if(mode==='originalAsc')sorted.sort((a,b)=>(+a.originalOrder||0)-(+b.originalOrder||0));
    if(mode==='addedNewest'||mode==='dateDesc')sorted.sort((a,b)=>savedTime(b)-savedTime(a));
    if(mode==='addedOldest'||mode==='dateAsc')sorted.sort((a,b)=>savedTime(a)-savedTime(b));
    if(mode==='bibleOrder')sorted.sort((a,b)=>bibleOrderValue(a)-bibleOrderValue(b));
    if(mode==='dateDescBible')sorted.sort((a,b)=>(dayTime(b.date)-dayTime(a.date))||(bibleOrderValue(a)-bibleOrderValue(b))||(savedTime(a)-savedTime(b)));
    if(mode==='dateAscBible')sorted.sort((a,b)=>(dayTime(a.date)-dayTime(b.date))||(bibleOrderValue(a)-bibleOrderValue(b))||(savedTime(a)-savedTime(b)));
    writeSaved(sorted); localStorage.setItem(SORT_KEY,mode); sessionStorage.setItem(REOPEN_KEY,'1'); sessionStorage.setItem(MODE_KEY,mode==='bibleOrder'?'권별':'일별'); location.reload();
  }
  function openSortSheet(){
    closeSortSheet(); normalizeSavedOrders(); const active=localStorage.getItem(SORT_KEY)||'manual';
    const backdrop=document.createElement('div'); backdrop.className='sion-sort-backdrop';
    backdrop.innerHTML=`<section class="sion-sort-sheet" role="dialog" aria-modal="true" aria-label="저장한 말씀 정렬"><div class="sion-sort-title">저장한 말씀 정렬</div><div class="sion-sort-subtitle">순서변경은 드래그용으로 그대로 두고, 정렬은 이 메뉴에서 선택합니다.</div><div class="sion-sort-grid">${SORT_OPTIONS.map(([m,l,h])=>`<button class="sion-sort-option" type="button" data-sort-mode="${m}" data-active="${active===m}"><span>${l}<small>${h}</small></span><strong>${active===m?'✓':''}</strong></button>`).join('')}</div><button class="sion-sort-close" type="button">닫기</button></section>`;
    backdrop.addEventListener('click',e=>{if(e.target===backdrop||e.target.closest('.sion-sort-close'))closeSortSheet();const opt=e.target.closest('[data-sort-mode]');if(opt)sortSaved(opt.getAttribute('data-sort-mode'))});
    document.body.appendChild(backdrop);
  }
  async function writeClipboard(value){
    try{await navigator.clipboard.writeText(value)}catch{const t=document.createElement('textarea');t.value=value;t.setAttribute('readonly','');t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}
  }
  const refSpanForCard=(card)=>[...card.querySelectorAll('span')].find(s=>/\s\d+:\d+/.test(s.textContent?.trim()||''));
  const getSavedCards=()=>[...document.querySelectorAll('main button')].filter(card=>isSavedScreen()&&refSpanForCard(card)&&card.querySelector('.serif-verse'));
  const cardRef=(card)=>refSpanForCard(card)?.textContent?.trim()||'';
  const cardText=(card)=>card.querySelector('.serif-verse')?.textContent?.trim()||'';
  async function copyCard(card){await writeClipboard(`${cardRef(card)}\n${cardText(card)}`.trim()); alert('복사되었습니다!')}
  function setCardSelected(card, selected){card.classList.toggle('sion-saved-card-selected',selected);const chk=card.querySelector('.sion-card-check');if(chk){chk.dataset.checked=String(selected);chk.setAttribute('aria-checked',String(selected));chk.innerHTML=selected?CHECK_ICON:''}}
  function toggleCard(card){
    if(!bulkCopyMode)return;
    const ref=cardRef(card); if(!ref)return;
    if(selectedRefs.has(ref)) selectedRefs.delete(ref); else selectedRefs.add(ref);
    setCardSelected(card, selectedRefs.has(ref)); updateBulkBar();
  }
  function updateBulkBar(){
    document.querySelector('.sion-bulk-copy-bar')?.remove(); if(!bulkCopyMode)return;
    const bar=document.createElement('div'); bar.className='sion-bulk-copy-bar';
    bar.innerHTML=`<div class="sion-bulk-copy-inner"><span class="sion-inline-action primary" data-sion-copy-selected>선택 ${selectedRefs.size}개 복사</span><span class="sion-inline-action" data-sion-copy-cancel>취소</span></div>`;
    bar.addEventListener('click',async e=>{const target=e.target instanceof Element?e.target:null;if(target?.closest('[data-sion-copy-cancel]')){bulkCopyMode=false;selectedRefs.clear();decorateSavedCards();updateBulkBar();return}if(target?.closest('[data-sion-copy-selected]')){const blocks=getSavedCards().filter(c=>selectedRefs.has(cardRef(c))).map(c=>`${cardRef(c)}\n${cardText(c)}`.trim()).filter(Boolean);if(!blocks.length){alert('복사할 말씀을 선택해주세요.');return}await writeClipboard(blocks.join('\n\n'));alert(`${blocks.length}개 말씀이 복사되었습니다!`)}});
    document.body.appendChild(bar);
  }
  function moveNativeActionsToGroup(topRow,actions,refSpan){[...topRow.children].forEach(child=>{if(child===refSpan||child===actions||child.classList?.contains('sion-card-copy')||child.classList?.contains('sion-card-check'))return;actions.appendChild(child)})}
  function decorateSavedCards(){
    if(!isSavedScreen())return;
    getSavedCards().forEach(card=>{
      const topRow=card.firstElementChild, refSpan=refSpanForCard(card); if(!topRow||!refSpan)return;
      topRow.style.display='flex'; topRow.style.alignItems='center'; topRow.style.gap='8px'; refSpan.style.flex='1 1 auto'; refSpan.style.minWidth='0'; refSpan.style.textAlign='left';
      let actions=topRow.querySelector('.sion-card-actions'); if(!actions){actions=document.createElement('span');actions.className='sion-card-actions';topRow.appendChild(actions)}
      moveNativeActionsToGroup(topRow,actions,refSpan);
      let copy=actions.querySelector('.sion-card-copy'); if(!copy){copy=document.createElement('span');copy.className='sion-card-copy sion-inline-action';copy.setAttribute('role','button');copy.setAttribute('aria-label','복사');copy.innerHTML=COPY_ICON;copy.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();copyCard(card)});actions.insertBefore(copy,actions.firstChild)}
      let check=actions.querySelector('.sion-card-check'); if(bulkCopyMode){if(!check){check=document.createElement('span');check.className='sion-card-check sion-inline-action';check.setAttribute('role','checkbox');check.setAttribute('aria-label','복사할 말씀 선택');check.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleCard(card)});actions.insertBefore(check,actions.firstChild)}setCardSelected(card,selectedRefs.has(cardRef(card)))}else{check?.remove();card.classList.remove('sion-saved-card-selected')}
    });
  }
  function decorateSavedToolbar(){
    if(!isSavedScreen())return; const reorder=findButtonByText('순서변경'); const parent=reorder?.parentElement; if(!parent)return;
    if(!parent.querySelector('[data-sion-sort-button]')){const b=document.createElement('button');b.type='button';b.dataset.sionSortButton='1';b.className='sion-inline-action primary';b.textContent='정렬';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openSortSheet()});parent.appendChild(b)}
    if(!parent.querySelector('[data-sion-bulk-copy-button]')){const b=document.createElement('button');b.type='button';b.dataset.sionBulkCopyButton='1';b.className='sion-inline-action';b.textContent='선택복사';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();bulkCopyMode=!bulkCopyMode;selectedRefs.clear();decorateSavedCards();updateBulkBar()});parent.appendChild(b)}
  }
  function sync(){document.body.classList.toggle('sion-saved-screen',isSavedScreen());decorateSavedToolbar();decorateSavedCards()}
  function reopenSavedTab(){if(sessionStorage.getItem(REOPEN_KEY)!=='1')return;const saved=[...document.querySelectorAll('button')].reverse().find(b=>b.textContent?.trim()==='저장');if(saved)saved.click();const mode=sessionStorage.getItem(MODE_KEY);if(mode)setTimeout(()=>{const mb=findButtonByText(mode);if(mb)mb.click();sessionStorage.removeItem(REOPEN_KEY);sessionStorage.removeItem(MODE_KEY)},260)}

  document.addEventListener('click',e=>{
    if(!bulkCopyMode||!isSavedScreen())return;
    const target=e.target instanceof Element?e.target:null; if(!target)return;
    if(target.closest('.sion-card-copy,.sion-card-check,.sion-bulk-copy-bar,[data-sion-sort-button],[data-sion-bulk-copy-button]'))return;
    const card=target.closest('main button');
    if(card&&getSavedCards().includes(card)){e.preventDefault();e.stopPropagation();toggleCard(card)}
  },true);

  normalizeSavedOrders();
  new MutationObserver(()=>{sync();reopenSavedTab()}).observe(document.body,{childList:true,subtree:true});
  addEventListener('load',()=>{sync();reopenSavedTab()});
})();
