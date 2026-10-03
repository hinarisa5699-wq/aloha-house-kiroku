// アロハハウス入居者記録アプリ  画面ロジック


// ===== 設定・通信 =====
const LS=k=>{try{return localStorage.getItem(k)}catch(e){return null}}, LSs=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const WD=['日','月','火','水','木','金','土'];
const MEALS=['朝食','昼食','夕食','おやつ'];
const SYMS=['むせ','咳込み','嘔気・嘔吐','残食多い','食欲低下','傾眠','拒食','介助で摂取','発熱','体調不良','その他'];
const DEFAULT_FORMS='常食,軟菜,一口大,きざみ,ミキサー,ソフト食,粥,その他';
// 接続設定：localStorage を主、Cookie(400日)とURLの #s= を予備にして、消えても復元できるようにする
const CK=k=>{try{const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}catch(e){return null}}, CKs=(k,v)=>{try{document.cookie=k+'='+encodeURIComponent(v)+';max-age=34560000;path=/;SameSite=Lax'}catch(e){}};
const encCfg=c=>btoa(unescape(encodeURIComponent(JSON.stringify({u:c.url,t:c.token})))).replace(/=+$/,''), decCfg=s=>{try{const o=JSON.parse(decodeURIComponent(escape(atob(s))));return o&&o.u?{url:o.u,token:o.t||''}:null}catch(e){return null}};
let cfg={url:LS('hc_url')||CK('hc_url')||'',token:LS('hc_token')||CK('hc_token')||''};
// スマホ・タブレット用リンク（?s=…&m=1）で開いた端末は「設定」タブを出さない（接続先はリンクに入っているので手で触る必要がない）
(function(){ if(/[?&]m=1(&|$|#)/.test(location.search)) LSs('hc_mode','m'); if(/[?&]m=0(&|$|#)/.test(location.search)){ try{ localStorage.removeItem('hc_mode'); }catch(e){} } /* m=0 でスマホ用の設定（設定タブ非表示）を解除 */ if(LS('hc_mode')==='m') document.body.classList.add('fixedcfg'); })();
(function(){ const m=(location.search+location.hash).match(/[?#&]s=([^&#]+)/); const h=m&&decCfg(m[1]); if(h){ cfg=h; } /* ?s= はURLに残す（ブラウザの保存データが消えても、リロードやブックマークで接続先が復元できるように） */ if(cfg.url){ LSs('hc_url',cfg.url); LSs('hc_token',cfg.token); CKs('hc_url',cfg.url); CKs('hc_token',cfg.token); } })();
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}
async function api(action, params={}){
  if(!cfg.url) throw new Error('設定でGASのURLを入れてください');
  let lastErr;
  for(let i=0;i<4;i++){ // GASがまれにHTMLを返すことがあるので、JSONでなければ少し待って再試行
    try{
      const body=JSON.stringify({action,token:cfg.token,...params});
      const q=encodeURIComponent(body);
      // 小さい要求は GET（?p=JSON）で送る：Safari は POST のままリダイレクト先へ行って 405 になるため。大きい要求（取り込み）だけ POST
      const useGet=q.length<7000;
      const url=useGet?cfg.url+(cfg.url.includes('?')?'&':'?')+'p='+q:cfg.url;
      const res=await fetch(url,useGet?{method:'GET',credentials:'omit'}:{method:'POST',credentials:'omit',headers:{'Content-Type':'text/plain'},body});
      const text=await res.text(); let j; try{ j=JSON.parse(text); }catch(e){ throw new Error('GASの応答が不正です（'+res.status+'）'); }
      if(!j.ok) throw new Error(j.error||'error'); return j.data;
    }catch(e){ lastErr=e; if(!/応答が不正|Failed to fetch|NetworkError|Load failed|途中で切れました|合言葉が違います/.test(e.message)) throw e; await new Promise(r=>setTimeout(r,800*(i+1))); }
  }
  throw lastErr;
}
function busy(on){document.body.style.cursor=on?'progress':'';}

// ===== 状態 =====
let D={date:todayStr(), residents:[], allResidents:[], staff:[], contacts:[], day:{meals:[],notes:[],schedules:[],ext:[]}, cur:null, meal:'朝食', forms:(LS('hc_forms')||DEFAULT_FORMS).split(',')};
// PDF読み取りライブラリは使うときだけ読み込む（起動時に外部から取りに行って画面が止まらないように）
async function ensurePdf(){ if(window.pdfjsLib) return; await new Promise((ok,ng)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload=ok; s.onerror=()=>ng(new Error('PDF読み取り部品を読み込めませんでした（通信を確認してください）')); document.head.appendChild(s); }); pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
window.ensurePdf=ensurePdf;

// ===== ナビ =====
function show(p){ $$('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===p)); $$('.panel').forEach(x=>x.classList.toggle('on',x.id==='p-'+p)); if(p==='list') renderList(); if(p==='sch') { fillSchRes(); loadSchList(); } if(p==='base'&&window.renderBaseTab) renderBaseTab(); if(p==='diary') renderDiary(); }
$$('nav.tabs button').forEach(b=>b.onclick=()=>show(b.dataset.p));
$('#date').value=D.date;
$('#date').onchange=e=>{D.date=e.target.value;loadDay(); if($('#p-diary').classList.contains('on')) renderDiary();};
$('#dPrev').onclick=()=>shiftDate(-1); $('#dNext').onclick=()=>shiftDate(1);
function shiftDate(n){const d=new Date(D.date+'T00:00:00');d.setDate(d.getDate()+n);D.date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;$('#date').value=D.date;loadDay(); if($('#p-diary').classList.contains('on')) renderDiary(); if($('#p-list').classList.contains('on')) renderList();}
function dateLabel(s){const d=new Date(s+'T00:00:00');return `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`;}

// ===== 読み込み =====
async function boot(){
  $('#cfgUrl').value=cfg.url; $('#cfgToken').value=cfg.token; $('#formsText').value=D.forms.join(',');
  if(!cfg.url){ $('#todayList').innerHTML='<div class="card">はじめに「設定」でGASのURLと合言葉を入れてください。</div>'; show('set'); return; }
  if(!(+LS('hc_login')>Date.now()) && +CK('hc_login')>Date.now()) LSs('hc_login',CK('hc_login')); // ログイン期限はCookieにも控える
  if(!(+LS('hc_login')>Date.now())){ // ログイン：まずパスワード画面をすぐ出す（サーバ側でパスワード未設定なら裏で確認して自動で通す）
    $('#loginGate').classList.remove('hide'); $('#loginPw').focus();
    api('login',{pw:''}).then(r=>{ if(r&&r.none){ LSs('hc_login',String(Date.now()+30*86400000)); $('#loginGate').classList.add('hide'); boot(); } }).catch(()=>{});
    return;
  }
  // 前回の内容をまず表示（開き直したときに「読み込み中」で待たせない）。そのあと裏で最新に更新
  const applyBoot=b=>{ D.residents=b.residents; D.allResidents=b.allResidents; D.staff=b.staff; D.contacts=b.contacts||[]; D.profiles=b.profiles||[]; renderStaffSel(); renderResTable(); $('#staffText').value=D.staff.join('\n'); };
  try{ const cb=JSON.parse(LS('hc_cache_boot')||'null'), cd=JSON.parse(LS('hc_cache_day')||'null'); if(cb&&cb.residents){ applyBoot(cb); if(cd&&cd.date===D.date&&cd.data){ D.day=cd.data; renderToday(); $('#ttl').textContent+='（更新中…）'; } } }catch(e){}
  const slow=setTimeout(()=>{ if(/読み込み中/.test($('#todayList').textContent)) $('#todayList').innerHTML='<div class="card">読み込みに時間がかかっています。通信状況を確認して、少し待つか<button class="btn" type="button" onclick="location.reload()">再読み込み</button>してください。</div>'; },15000);
  try{ busy(true); const b=await api('init',{date:D.date}); const d=b.day; delete b.day; applyBoot(b); LSs('hc_cache_boot',JSON.stringify(b)); showAiStatus(); D.day=d; LSs('hc_cache_day',JSON.stringify({date:D.date,data:d})); renderToday(); if($('#p-entry').classList.contains('on')) renderEntry(); if($('#p-list').classList.contains('on')) renderList(); clearTimeout(slow); }
  catch(e){ $('#todayList').innerHTML=`<div class="card">接続できません：${e.message}<br><span class="muted">設定を確認してください</span></div>`; }
  finally{ busy(false); }
}
async function loadDay(){
  try{ busy(true); const d=await api('day',{date:D.date}); D.day=d; LSs('hc_cache_day',JSON.stringify({date:D.date,data:d})); renderToday(); if($('#p-entry').classList.contains('on')) renderEntry(); if($('#p-list').classList.contains('on')) renderList(); }
  catch(e){ toast('読み込み失敗: '+e.message); } finally{ busy(false); }
}
const mealOf=(rid,meal)=>D.day.meals.find(m=>m['利用者ID']===rid&&m['食事']===meal);
const extOf=rid=>(D.day.ext||[]).filter(e=>e['利用者ID']===rid||(rid&&e['利用者ID']===''&&false)).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
// ハウス全体の記録（利用者IDなし：ハウス日誌の全体の文、LINEの地震・設備・オンコール全体報告など）
const houseExt=()=>(D.day.ext||[]).filter(e=>e['利用者ID']===''&&e['内容']).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
const houseHtml=()=>{ const l=houseExt(); if(!l.length) return ''; return `<div style="margin-top:8px"><b style="font-size:13px">ハウス全体の記録</b>${l.map(e=>`<div class="ext ${extSrc(e)}" style="margin-top:4px"><span class="m">${e['時刻']||''} ${esc(e['出所']==='ハウス日誌'?'ハウス日誌':e['出所'])}${e['種別']?'・'+esc(e['種別']):''}${e['記録者']?' '+esc(e['記録者']):''}</span><br>${esc(e['内容'])}</div>`).join('')}</div>`; };
const extLabel=e=>e['出所']==='介護記録'?('デイ'+(e['種別']?'・'+e['種別']:'')):e['出所']==='訪看記録'?'訪看':e['出所']==='訪介記録'?('訪介'+(e['種別']?'・'+e['種別']:'')):(e['出所']+(e['種別']&&e['種別']!=='ケース'?'・'+e['種別']:''));
const extSrc=e=>({'訪看記録':'src-nurse','訪介記録':'src-helper','介護記録':'src-day','ハウス日誌':'src-day','LINE':'src-line'})[e['出所']]||'';
const extHtml=e=>`<div class="ext ${extSrc(e)}"><span class="m">${e['時刻']||''} ${esc(extLabel(e))}${e['記録者']?' '+esc(e['記録者']):''}</span><br>${esc(e['内容'])}</div>`;
const extCell=e=>`<span class="xt ${extSrc(e)}"><b>${e['時刻']||''} ${esc(extLabel(e))}</b>${esc(e['内容'])}</span>`;
const schOf=rid=>D.day.schedules.filter(s=>s['利用者ID']===rid).sort((a,b)=>(a['開始']||'').localeCompare(b['開始']||''));
const schCls=s=>({'訪看':'nurse','訪リハ':'rehab','訪介':'helper','デイ':'day'})[s['種別']]||'manual';
function fmtSch(s,withEnd){ const c=s['内容']||''; const body=(c.startsWith(s['種別'])||c.includes(s['種別']))?c:(s['種別']+(c?' '+c:'')); return (s['開始']?s['開始']+(withEnd&&s['終了']?'-'+s['終了']:'')+' ':'')+body+(s['担当']?' '+s['担当']:''); }
function schHtml(s){ return `<span class="sch ${schCls(s)}">${esc(fmtSch(s,true))}</span>`; }
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}

// ===== 今日 =====
function chip(m){
  if(!m) return '<span class="chip">未</span>';
  if(m['主食']==='注文なし') return '<span class="chip skip">注文なし</span>';
  if(m['主食']==='欠') return '<span class="chip skip">欠食</span>';
  const st=+m['主食'], sd=+m['副食']; const sym=m['症状'];
  const c=sym?'sym':(st<=5||sd<=5)?'low':'done';
  return `<span class="chip ${c}">${m['主食']}/${m['副食']}${m['汁物']&&m['汁物']!=='なし'?'/'+m['汁物']:''}${m['服薬']==='済'?' 薬✓'+(m['服薬時刻']||''):m['服薬']==='未'?' 薬未':''}</span>`;
}
// 今日の予定（全員分を時刻順に一覧）
function renderTodaySch(){
  const el=$('#todaySch'); if(!el) return;
  const ids=new Set(D.residents.map(r=>r.id)); const nm=Object.fromEntries(D.residents.map(r=>[r.id,r]));
  const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
  const HOUSE={id:'','部屋':'—','氏名':'アロハハウス'}; nm['']=HOUSE;
  const list=(D.day.schedules||[]).filter(s=>ids.has(s['利用者ID'])||s['利用者ID']==='').sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始']))||String(nm[a['利用者ID']]['部屋']).localeCompare(String(nm[b['利用者ID']]['部屋'])));
  if(!list.length){ el.innerHTML='<span class="muted">予定なし</span>'+houseHtml(); return; }
  const body=(s)=>{ const c=s['内容']||''; return (c.startsWith(s['種別'])||c.includes(s['種別']))?c:(s['種別']+(c?' '+c:'')); };
  el.innerHTML='<table class="grid" style="width:100%;font-size:13px"><tr><th style="width:92px">時間</th><th style="width:34px">部屋</th><th style="width:110px">氏名</th><th style="text-align:left">予定</th><th style="width:70px">担当</th></tr>'+list.map(s=>{ const r=nm[s['利用者ID']]; return `<tr class="${r.id?'sch-row':''}" data-id="${r.id}" style="${r.id?'cursor:pointer':'background:#fff7e6'}"><td>${s['開始']||''}${s['終了']?'-'+s['終了']:''}</td><td>${esc(r['部屋'])}</td><td class="l">${esc(r['氏名'])}</td><td style="text-align:left"><span class="sch ${schCls(s)}">${esc(body(s))}</span></td><td>${esc(s['担当']||'')}</td></tr>`; }).join('')+'</table>';
  el.insertAdjacentHTML('beforeend', houseHtml());
  $$('#todaySch .sch-row').forEach(tr=>tr.onclick=()=>openEntry(tr.dataset.id));
}
// 取り込みの実施記録（介護記録PDF・LINE）。今日まだなら「今日の予定/食事」の上に注意を出す
function importLast(){ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']==='import_last'); try{ return r?JSON.parse(r['値'])||{}:{}; }catch(e){ return {}; } }
async function stampImport(kinds){ const v=importLast(); const now=new Date(); const t=`${todayStr()} ${pad(now.getHours())}:${pad(now.getMinutes())}`; kinds.forEach(k=>v[k]=t); try{ await api('saveProfile',{residentId:'',key:'import_last',value:v}); }catch(e){} D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===''&&p['キー']==='import_last')); D.profiles.push({'利用者ID':'','キー':'import_last','値':JSON.stringify(v)}); renderImportWarn(); }
function renderImportWarn(){ const el=$('#impWarn'); if(!el) return; const v=importLast(); const need=[['介護記録','介護記録（毎日の記録・業務日誌）'],['LINE','LINEトーク']]; const miss=need.filter(([k])=>!(v[k]||'').startsWith(todayStr())); const done=need.filter(([k])=>(v[k]||'').startsWith(todayStr()));
  if(!miss.length){ el.className='card'; el.style.cssText='padding:6px 12px;background:#eefaf0;border-color:#b7e1c1;font-size:12.5px'; el.innerHTML=`✓ 今日の取り込み済み：${done.map(([k,l])=>l+' '+esc(v[k].slice(11))).join('　')}`; return; }
  el.className='card'; el.style.cssText='padding:8px 12px;background:#fff3f3;border-color:#f3b4b4;color:#b3261e;font-weight:700'; el.innerHTML=`⚠ 今日まだ取り込んでいません：${miss.map(([k,l])=>l).join('、')}<div class="muted" style="font-weight:400;color:#7a1f1a;font-size:12px">${done.length?'取り込み済み：'+done.map(([k,l])=>l+' '+esc(v[k].slice(11))).join('　')+'　':''}${miss.some(([k])=>k==='LINE')?'LINEトークはパソコンの「設定」タブから取り込んでください（毎日必須）。':''}${miss.some(([k])=>k==='介護記録')?'介護記録はパソコンのChromeが起動していれば自動で取り込まれます（すぐ入れたいときは拡張機能の「デイ：業務日誌＋介護記録」）。':''}</div>`; }
function renderToday(){
  renderImportWarn();
  $('#ttl').textContent=`入居者記録 ${dateLabel(D.date)}`;
  if(!D.residents.length){ $('#todayList').innerHTML='<div class="card">入居者が登録されていません。「設定」から登録してください。</div>'; return; }
  renderTodaySch();
  $('#todayList').innerHTML=D.residents.map(r=>{
    const sch=schOf(r.id); const notes=D.day.notes.filter(n=>n['利用者ID']===r.id).length; const nx=extOf(r.id).length;
    return `<div class="res" data-id="${r.id}"><div class="room">${esc(r['部屋'])}</div><div class="nm">${esc(r['氏名'])}<small>${esc(sch.map(s=>fmtSch(s)).join('／'))}${notes?`　様子${notes}件`:''}${nx?`　記録${nx}件`:''}</small></div><div class="chips">${['朝食','昼食','夕食'].map(m=>chip(mealOf(r.id,m))).join('')}</div></div>`;
  }).join('');
  $$('#todayList .res').forEach(el=>el.onclick=()=>openEntry(el.dataset.id));
}

// ===== 入力 =====
function openEntry(rid){ D.cur=D.residents.find(r=>r.id===rid)||D.allResidents.find(r=>r.id===rid); const h=new Date().getHours(); D.meal=h<10?'朝食':h<15?'昼食':h<17?'おやつ':'夕食'; show('entry'); renderEntry(); window.scrollTo(0,0); }
$('#backBtn').onclick=()=>show('today');
function segButtons(id, vals, onPick){ const el=$('#'+id); el.innerHTML=vals.map(v=>`<button type="button" data-v="${v}">${v}</button>`).join(''); el.onclick=e=>{const b=e.target.closest('button'); if(!b) return; if(el.classList.contains('multi')){ b.classList.toggle('on'); } else { const was=b.classList.contains('on'); [...el.children].forEach(x=>x.classList.toggle('on',x===b&&!was)); } onPick&&onPick(); }; } // 選んでいるボタンをもう一度押すと取り消し
segButtons('staple',['0','2','5','8','10','欠','注文なし']); segButtons('side',['0','2','5','8','10']); segButtons('soup',['0','2','5','8','10','なし']); segButtons('med',['済','未','薬なし']); segButtons('water',['0','50','100','150','200','300']); $('#sym').classList.add('multi'); segButtons('sym',SYMS);
const segVal=id=>{const b=$('#'+id+' button.on');return b?b.dataset.v:'';};
const segSet=(id,v)=>{$$('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));};
function renderStaffSel(){ const cur=LS('hc_staff')||''; $('#staff').innerHTML='<option value="">（選択）</option>'+D.staff.map(s=>`<option ${s===cur?'selected':''}>${esc(s)}</option>`).join(''); $('#form').innerHTML=D.forms.map(f=>`<option>${esc(f)}</option>`).join(''); }
function renderEntry(){
  const r=D.cur; if(!r) return;
  $('#eName').textContent=r['氏名']; $('#eRoom').textContent=(r['部屋']?r['部屋']+'号室':'')+(r['食事形態']?'　'+r['食事形態']:'');
  const sch=schOf(r.id); $('#eSch').innerHTML=`${dateLabel(D.date)}の予定：`+(sch.length?sch.map(schHtml).join(''):'<span class="muted">なし</span>');
  $('#mealTabs').innerHTML=MEALS.map(m=>`<button type="button" class="${m===D.meal?'on':''} ${mealOf(r.id,m)?'done':''}" data-m="${m}">${m}</button>`).join('');
  $$('#mealTabs button').forEach(b=>b.onclick=()=>{D.meal=b.dataset.m;renderEntry();});
  const m=mealOf(r.id,D.meal)||{};
  segSet('staple',m['主食']||''); segSet('side',m['副食']||''); segSet('soup',m['汁物']||''); segSet('med',m['服薬']||''); $('#medV').textContent=m['服薬']==='済'?('✓ '+(m['服薬時刻']||'')+(m['記入者']?' '+m['記入者']:'')):''; segSet('water',m['水分']||'');
  $('#form').value=m['食事形態']||r['食事形態']||D.forms[0]; if(!$('#form').value) $('#form').selectedIndex=0;
  const syms=(m['症状']||'').split(',').filter(Boolean); $$('#sym button').forEach(b=>b.classList.toggle('on',syms.includes(b.dataset.v)));
  $('#memo').value=m['備考']||''; if(m['記入者']) $('#staff').value=m['記入者'];
  $('#delMeal').style.display=m.id?'':'none';
  renderInfo();
  renderNotes();
  const ex=extOf(r.id); $('#extToday').innerHTML=ex.length?ex.map(extHtml).join(''):'<span class="muted">この日の取込記録はありません</span>';
}
// ===== 基本情報・関係先 =====
const CKINDS=['ケアマネ','訪問看護','訪問介護','主治医・病院','歯科','薬局','デイ','福祉用具','家族・キーパーソン','行政・その他'];
const contactsOf=rid=>D.contacts.filter(c=>c['利用者ID']===rid);
const telLink=s=>esc(s).replace(/(0\d{1,4}-?\d{1,4}-?\d{3,4})/g,'<a href="tel:$1">$1</a>');
function ageOf(d){ if(!d) return ''; const a=new Date(d+'T00:00:00'), n=new Date(); let y=n.getFullYear()-a.getFullYear(); const m=n.getMonth()-a.getMonth()+(n.getDate()<a.getDate()?-1:0); const mm=((m%12)+12)%12; if(m<0) y--; return y>0?`${y}年${mm}か月`:`${mm}か月`; }
function renderInfo(){
  const r=D.cur; const cs=contactsOf(r.id);
  const lines=[];
  lines.push(`入居日：${r['入居日']?esc(r['入居日'].replace(/-/g,'/'))+'（'+ageOf(r['入居日'])+'）':'<span class="muted">未登録</span>'}　食事形態：${esc(r['食事形態']||'—')}${r['メモ']?'　'+esc(r['メモ']):''}`);
  lines.push(`既往歴：${r['既往歴']?esc(r['既往歴']):'<span class="muted">未登録</span>'}`);
  if(cs.length) lines.push(cs.map(c=>`<div class="ext" style="border-color:#1d6fb8;background:#eef4fb"><b>${esc(c['種別'])}</b> ${esc(c['事業所'])}${c['担当者']?'　'+esc(c['担当者']):''}${c['連絡先']?'　'+telLink(c['連絡先']):''}${c['メモ']?'<br><span class="m">'+esc(c['メモ'])+'</span>':''}</div>`).join(''));
  else lines.push('<span class="muted">関係先：未登録</span>');
  $('#infoView').innerHTML=lines.join('<br>');
}
function contactRow(c={}){ return `<div class="crow"><select data-k="種別">${CKINDS.map(k=>`<option ${c['種別']===k?'selected':''}>${k}</option>`).join('')}</select><input data-k="事業所" placeholder="事業所名" value="${esc(c['事業所']||'')}"><input data-k="担当者" placeholder="担当者" value="${esc(c['担当者']||'')}"><input data-k="連絡先" placeholder="電話など" value="${esc(c['連絡先']||'')}"><button type="button" class="cDel">×</button><input class="w2" data-k="メモ" placeholder="メモ（曜日・時間帯など）" value="${esc(c['メモ']||'')}" style="grid-column:2/5"></div>`; }
$('#infoMore').onclick=()=>openBase(D.cur.id);
$('#infoEdit').onclick=()=>{ const r=D.cur; $('#iMoveIn').value=r['入居日']||''; $('#iForm').value=r['食事形態']||''; $('#iHistory').value=r['既往歴']||''; $('#iMemo').value=r['メモ']||''; $('#formList2').innerHTML=D.forms.map(f=>`<option value="${esc(f)}">`).join(''); $('#cRows').innerHTML=contactsOf(r.id).map(contactRow).join(''); $('#infoForm').classList.remove('hide'); $('#infoView').classList.add('hide'); };
$('#cRows').addEventListener('click',e=>{ if(e.target.classList.contains('cDel')) e.target.closest('.crow').remove(); });
$('#cAdd').onclick=()=>{ $('#cRows').insertAdjacentHTML('beforeend',contactRow()); };
$('#infoCancel').onclick=()=>{ $('#infoForm').classList.add('hide'); $('#infoView').classList.remove('hide'); };
$('#infoSave').onclick=async()=>{
  const r=D.cur; const rows=[...$('#cRows').querySelectorAll('.crow')].map(row=>{ const o={'氏名':r['氏名']}; row.querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.value.trim()); return o; }).filter(o=>o['事業所']||o['担当者']||o['連絡先']);
  try{ busy(true); const upd=await api('updateResident',{id:r.id,'入居日':$('#iMoveIn').value,'食事形態':$('#iForm').value.trim(),'既往歴':$('#iHistory').value.trim(),'メモ':$('#iMemo').value.trim()});
    Object.assign(r,upd); const idx=D.allResidents.findIndex(x=>x.id===r.id); if(idx>=0) Object.assign(D.allResidents[idx],upd);
    const saved=await api('saveContacts',{residentId:r.id,rows}); D.contacts=D.contacts.filter(c=>c['利用者ID']!==r.id).concat(saved);
    $('#infoForm').classList.add('hide'); $('#infoView').classList.remove('hide'); renderEntry(); renderResTable(); toast('保存しました'); }
  catch(e){ toast('失敗: '+e.message); } finally{ busy(false); }
};
$('#saveMeal').onclick=async()=>{
  const r=D.cur; const staple=segVal('staple'), side=segVal('side'); const msg=$('#saveMsg');
  const ng=(t,el)=>{ msg.textContent='⚠ '+t; toast(t); if(el){ el.scrollIntoView({block:'center',behavior:'smooth'}); el.style.outline='3px solid #c0392b'; setTimeout(()=>el.style.outline='',2500); } };
  if(!staple) return ng('主食の量を選んでください',$('#staple'));
  const noMeal=staple==='欠'||staple==='注文なし'; // 欠食／注文なし（食事を出していない）
  if(!noMeal&&!side) return ng('副食の量を選んでください',$('#side'));
  const staff=$('#staff').value; if(!staff) return ng('記入者を選んでください（下の「記入者」）',$('#staff')); LSs('hc_staff',staff); msg.textContent='';
  const rec={id:(mealOf(r.id,D.meal)||{}).id||'', '日付':D.date,'食事':D.meal,'利用者ID':r.id,'氏名':r['氏名'],'主食':staple,'副食':noMeal?staple:side,'汁物':noMeal?'':segVal('soup'),'服薬':segVal('med'),'服薬時刻':(()=>{ const v=segVal('med'); if(v!=='済') return ''; const cur=mealOf(r.id,D.meal); if(cur&&cur['服薬']==='済'&&cur['服薬時刻']) return cur['服薬時刻']; const n=new Date(); return pad(n.getHours())+':'+pad(n.getMinutes()); })(),'水分':segVal('water'),'食事形態':$('#form').value,
    '症状':$$('#sym button.on').map(b=>b.dataset.v).join(','),'備考':$('#memo').value.trim(),'記入者':staff};
  try{ busy(true); $('#saveMeal').disabled=true; $('#saveMeal').textContent='保存中…'; const saved=await api('saveMeal',{record:rec}); D.day.meals=D.day.meals.filter(m=>!(m['利用者ID']===r.id&&m['食事']===D.meal)); D.day.meals.push(saved); toast(`${r['氏名']} ${D.meal} 保存しました`); msg.style.color='#1f7a3a'; msg.textContent=`✓ ${D.meal} 保存しました`; setTimeout(()=>{ msg.textContent=''; msg.style.color='#c0392b'; },3000); renderEntry(); renderToday(); }
  catch(e){ msg.textContent='⚠ 保存できませんでした: '+e.message; toast('保存失敗: '+e.message); } finally{ busy(false); $('#saveMeal').disabled=false; $('#saveMeal').textContent='保存'; }
};
$('#delMeal').onclick=async()=>{ const r=D.cur; const m=mealOf(r.id,D.meal); if(!m||!confirm(`${r['氏名']} ${D.meal}の記録を消しますか？`)) return; try{ await api('saveMeal',{record:{...m,_delete:true}}); D.day.meals=D.day.meals.filter(x=>x.id!==m.id); renderEntry(); renderToday(); toast('消しました'); }catch(e){toast('失敗: '+e.message);} };
function renderNotes(){ const r=D.cur; const list=D.day.notes.filter(n=>n['利用者ID']===r.id).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'')); $('#noteList').innerHTML=list.map(n=>`<div class="n"><div class="m">${n['時刻']||''} ${esc(n['種別'])}　${esc(n['記入者'])} <button class="btn danger" data-del="${n.id}" style="padding:1px 8px;font-size:11px;float:right">削除</button></div>${esc(n['内容'])}</div>`).join(''); $$('#noteList [data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('削除しますか？')) return; await api('saveNote',{record:{id:b.dataset.del,_delete:true}}); api('saveDiary',{record:{id:'n-'+b.dataset.del,_delete:true}}).catch(()=>{}); D.day.notes=D.day.notes.filter(n=>n.id!==b.dataset.del); renderNotes(); renderToday(); }); }
$('#saveNote').onclick=async()=>{
  const r=D.cur; const text=$('#nText').value.trim(); if(!text) return toast('内容を入れてください'); const staff=$('#staff').value; if(!staff) return toast('記入者を選んでください'); LSs('hc_staff',staff);
  const rec={'日付':D.date,'時刻':$('#nTime').value||`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`,'利用者ID':r.id,'氏名':r['氏名'],'種別':$('#nKind').value,'内容':text,'記入者':staff};
  const nb=$('#saveNote'); if(nb.disabled) return; nb.disabled=true; nb.textContent='追加中…';
  try{ busy(true); const saved=await api('saveNote',{record:rec}); D.day.notes.push(saved); $('#nText').value=''; $('#nTime').value=''; renderNotes(); renderToday(); toast('追加しました（日誌にも記録）');
    // 様子・特記はそのまま個人日誌にも載せる（id を n-様子ID にして、様子を消したら日誌も消えるようにする）
    api('saveDiary',{record:{id:'n-'+saved.id,'日付':rec['日付'],'時刻':rec['時刻'],'利用者ID':rec['利用者ID'],'氏名':rec['氏名'],'種別':rec['種別'],'内容':rec['内容'],'記入者':staff,'出所':'様子記録'}}).catch(()=>{});
  }catch(e){toast('失敗: '+e.message);} finally{busy(false); nb.disabled=false; nb.textContent='様子を追加';}
};

// ===== 日誌 =====
const DKINDS=['排泄','服薬','食事','体調','受診・往診','家族','様子','連絡','その他'];
$('#dMode').onchange=()=>{ $('#dRes').classList.toggle('hide',$('#dMode').value!=='month'); renderDiary(); };
$('#dRes').onchange=()=>renderDiary();
$('#dPrint').onclick=()=>{ document.body.classList.add('print-diary'); const off=()=>document.body.classList.remove('print-diary'); window.addEventListener('afterprint',off,{once:true}); setTimeout(()=>window.print(),50); setTimeout(off,60000); };
function diaryEntry(e,showName){ return `<div class="n" data-did="${e.id}"><div class="m">${e['時刻']||''} ${esc(e['種別']||'')}${showName?'　'+esc(e['氏名']):''}　<span class="muted">${esc(e['出所']||'')}${e['記入者']&&e['記入者']!=='LINE'?' '+esc(e['記入者']):''}</span> <button class="btn danger noprint" data-ddel="${e.id}" style="padding:1px 8px;font-size:11px;float:right">削除</button></div>${esc(e['内容'])}</div>`; }
async function renderDiary(){
  const out=$('#diaryOut'); const mode=$('#dMode').value;
  $('#dRes').innerHTML=D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join('');
  out.innerHTML='<div class="muted">読み込み中…</div>';
  try{
    if(mode==='day'){
      const list=await api('diaryList',{date:D.date}); const sortT=(a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'');
      out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">アロハハウス　個人日誌　${D.date.slice(0,4)}年${dateLabel(D.date)}</h2>`+D.residents.map(r=>{ const es=list.filter(e=>e['利用者ID']===r.id).sort(sortT);
        return `<div class="card" style="page-break-inside:avoid"><div class="row" style="align-items:center"><h2 style="margin:0;flex:1;font-size:14px">${esc(r['部屋'])}　${esc(r['氏名'])}</h2><button class="btn noprint" data-dadd="${r.id}" style="flex:none;padding:4px 10px">＋ 追加</button></div><div class="dform hide" data-dform="${r.id}" style="margin-top:6px"><div class="row"><input type="time" data-k="時刻" style="flex:none;width:110px"><select data-k="種別" style="flex:none;width:120px">${DKINDS.map(k=>`<option>${k}</option>`).join('')}</select></div><textarea data-k="内容" placeholder="記録（事実を短く）" style="min-height:64px;margin-top:4px"></textarea><div class="row" style="margin-top:4px"><button class="btn pri" data-dsave="${r.id}" style="flex:none">保存</button><button class="btn" data-dcancel="${r.id}" style="flex:none">閉じる</button></div></div>${es.length?es.map(e=>diaryEntry(e,false)).join(''):'<div class="muted">記録なし</div>'}</div>`; }).join('');
    } else {
      const rid=$('#dRes').value; const r=D.residents.find(x=>x.id===rid); if(!r) return; const ym=D.date.slice(0,7);
      const list=(await api('diaryList',{ym,residentId:rid})).sort((a,b)=>(a['日付']+a['時刻']).localeCompare(b['日付']+b['時刻']));
      const byDay={}; list.forEach(e=>{ (byDay[e['日付']]=byDay[e['日付']]||[]).push(e); });
      const [y,mo]=ym.split('-').map(Number);
      out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">アロハハウス　個人日誌　${esc(r['氏名'])} 様　${y}年${mo}月</h2>`+(Object.keys(byDay).length?Object.keys(byDay).sort().map(d=>`<div class="card" style="page-break-inside:avoid"><h2 style="margin:0 0 4px;font-size:14px">${dateLabel(d)}</h2>${byDay[d].map(e=>diaryEntry(e,false)).join('')}</div>`).join(''):'<div class="card muted">この月の日誌はありません</div>');
    }
    $$('#diaryOut [data-dadd]').forEach(b=>b.onclick=()=>{ const f=$(`#diaryOut [data-dform="${b.dataset.dadd}"]`); f.classList.toggle('hide'); if(!f.querySelector('[data-k="時刻"]').value){ const n=new Date(); f.querySelector('[data-k="時刻"]').value=`${pad(n.getHours())}:${pad(n.getMinutes())}`; } });
    $$('#diaryOut [data-dcancel]').forEach(b=>b.onclick=()=>$(`#diaryOut [data-dform="${b.dataset.dcancel}"]`).classList.add('hide'));
    $$('#diaryOut [data-dsave]').forEach(b=>b.onclick=async()=>{ const rid=b.dataset.dsave; const r=D.residents.find(x=>x.id===rid); const f=$(`#diaryOut [data-dform="${rid}"]`); const text=f.querySelector('[data-k="内容"]').value.trim(); if(!text) return toast('内容を入れてください'); const staff=$('#staff').value||LS('hc_staff')||''; if(!staff) return toast('入力画面で記入者を選んでください');
      try{ busy(true); await api('saveDiary',{record:{'日付':D.date,'時刻':f.querySelector('[data-k="時刻"]').value,'利用者ID':rid,'氏名':r['氏名'],'種別':f.querySelector('[data-k="種別"]').value,'内容':text,'記入者':staff,'出所':'手入力'}}); toast('保存しました'); renderDiary(); }catch(e){ toast('失敗: '+e.message); } finally{ busy(false); } });
    $$('#diaryOut [data-ddel]').forEach(b=>b.onclick=async()=>{ if(!confirm('この日誌を削除しますか？')) return; try{ await api('saveDiary',{record:{id:b.dataset.ddel,_delete:true}}); renderDiary(); }catch(e){ toast('失敗: '+e.message); } });
  }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
}

// ===== 月間カレンダー描画 =====
function calendarHtml(ym, evByDay, title, sub, legend){
  const [y,m]=ym.split('-').map(Number); const first=new Date(y,m-1,1); const days=new Date(y,m,0).getDate();
  let html=`<div class="calsheet"><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px"><h2 style="margin:0;font-size:17px">${title}</h2><span class="muted">${y}年${m}月　${sub||''}</span><span style="margin-left:auto;font-size:11px">${legend||''}</span></div><table class="cal"><thead><tr>`;
  html+=WD.map((w,i)=>`<th class="${i===0?'sun':i===6?'sat':''}">${w}</th>`).join('')+'</tr></thead><tbody>';
  let d=1-first.getDay();
  while(d<=days){ html+='<tr>';
    for(let i=0;i<7;i++,d++){ if(d<1||d>days){ html+='<td class="out"></td>'; continue; }
      const evs=(evByDay[d]||[]).slice().sort((a,b)=>(a.start||'').localeCompare(b.start||''));
      html+=`<td><div class="d ${i===0?'sun':i===6?'sat':''}">${d}</div>`+evs.map(e=>`<div class="ev ${e.cls}"><span class="t">${e.start||''}${e.end?'-'+e.end:''}</span>${esc(e.text)}</div>`).join('')+'</td>'; }
    html+='</tr>'; }
  return html+'</tbody></table></div>';
}

// ===== 一覧 =====
$('#lMode').onchange=()=>{ $('#lRes').classList.toggle('hide',!['month','cal','week'].includes($('#lMode').value)); renderList(); };
$('#lRes').onchange=renderList; $('#printBtn').onclick=()=>window.print();
async function renderList(){
  const mode=$('#lMode').value; const out=$('#listOut'); out.classList.toggle('board',mode==='board');
  $('#lRes').innerHTML=D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join('');
  if(mode==='day'){
    const cell=m=>{ if(!m) return '<td></td>'; if(m['主食']==='注文なし') return '<td class="skip">注文なし</td>'; if(m['主食']==='欠') return '<td class="skip">欠食</td>'; const cls=m['症状']?'sym':(+m['主食']<=5||+m['副食']<=5)?'low':''; return `<td class="${cls}">${m['主食']}/${m['副食']}${m['汁物']&&m['汁物']!=='なし'?'/'+m['汁物']:''}${m['服薬']==='済'?' 薬✓'+(m['服薬時刻']||''):m['服薬']==='未'?' <b style="color:#b3261e">薬未</b>':''}${m['水分']?'<br><small>'+m['水分']+'ml</small>':''}${m['症状']?'<br><small>'+esc(m['症状'])+'</small>':''}${m['備考']?'<br><small>'+esc(m['備考'])+'</small>':''}</td>`; };
    out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">この日の全員（食事・予定・記録）　${D.date.replace(/-/g,'/')}(${WD[new Date(D.date+'T00:00:00').getDay()]})</h2><table class="grid stk2"><tr><th>部屋</th><th>氏名</th><th>朝食<br>主/副</th><th>昼食<br>主/副</th><th>おやつ</th><th>夕食<br>主/副</th><th>予定</th><th>様子・特記</th><th>他部署の記録<br><span style="font-weight:400;font-size:10.5px"><span class="xt src-nurse" style="display:inline-block;padding:0 4px">訪看</span> <span class="xt src-helper" style="display:inline-block;padding:0 4px">訪介</span> <span class="xt src-day" style="display:inline-block;padding:0 4px">デイ</span> <span class="xt src-line" style="display:inline-block;padding:0 4px">LINE</span></span></th></tr>`+
      D.residents.map(r=>`<tr><td>${esc(r['部屋'])}</td><td class="l">${esc(r['氏名'])}</td>${['朝食','昼食','おやつ','夕食'].map(m=>cell(mealOf(r.id,m))).join('')}<td class="l" style="white-space:normal;text-align:left">${schOf(r.id).map(s=>esc(fmtSch(s))).join('<br>')}</td><td style="text-align:left">${D.day.notes.filter(n=>n['利用者ID']===r.id).map(n=>`${n['時刻']||''} ${esc(n['種別'])}:${esc(n['内容'])}`).join('<br>')}</td><td style="text-align:left">${extOf(r.id).map(extCell).join('')}</td></tr>`).join('')+'</table><div class="legend">数字は主食/副食の摂取割合（10=全量）。橙=半分以下、赤=症状あり。</div>'+houseHtml();
  } else if(mode==='board'){
    // ホワイトボード掲示用：この日の全員の予定をA4縦1枚に大きく。手書き用の備考欄とメモ欄付き
    const ids=new Set(D.residents.map(r=>r.id)); const nm=Object.fromEntries(D.residents.map(r=>[r.id,r])); nm['']={id:'','部屋':'—','氏名':'アロハハウス'};
    const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
    const list=(D.day.schedules||[]).filter(s=>ids.has(s['利用者ID'])||s['利用者ID']==='').sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始']))||String(nm[a['利用者ID']]['部屋']).localeCompare(String(nm[b['利用者ID']]['部屋'])));
    const body=s=>{ const c=s['内容']||''; return (c.startsWith(s['種別'])||c.includes(s['種別']))?c:(s['種別']+(c?' '+c:'')); };
    const d=new Date(D.date+'T00:00:00'); const has=new Set(list.map(s=>s['利用者ID'])); const none=D.residents.filter(r=>!has.has(r.id));
    const house=houseExt();
    out.innerHTML=`<h2 class="bh">アロハハウス　本日の予定　${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WD[d.getDay()]}）</h2><table class="board"><tr><th>時間</th><th>部屋</th><th>氏名</th><th>予定</th><th>担当</th><th>備考</th></tr>`+
      (list.length?list.map(s=>{ const r=nm[s['利用者ID']]; return `<tr><td class="t">${esc(s['開始']||'')}${s['終了']?'<br><span style="font-weight:400;font-size:11pt">〜'+esc(s['終了'])+'</span>':''}</td><td class="rm">${esc(r['部屋'])}</td><td class="nm">${esc(r['氏名'])}</td><td>${esc(body(s))}</td><td>${esc(s['担当']||'')}</td><td class="memo"></td></tr>`; }).join(''):'<tr><td colspan="6">予定なし</td></tr>')+'</table>'+
      (none.length?`<p class="sub">予定なし：${none.map(r=>esc(r['部屋'])+' '+esc(r['氏名'])).join('　')}</p>`:'')+
      (house.length?`<p class="sub">ハウス全体：${house.map(e=>(e['時刻']?e['時刻']+' ':'')+esc(e['内容'])).join('　／　')}</p>`:'')+
      '<div class="memo-box">連絡・メモ</div>';
  } else if(mode==='info'){
    out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">入居者一覧　${new Date().toLocaleDateString('ja-JP')}現在</h2><table class="grid"><tr><th>部屋</th><th>氏名</th><th>ふりがな</th><th>入居日</th><th>食事形態</th><th>既往歴</th><th>関係事業所・担当者・連絡先</th></tr>`+
      D.residents.map(r=>`<tr><td>${esc(r['部屋'])}</td><td class="l">${esc(r['氏名'])}</td><td class="l">${esc(r['ふりがな'])}</td><td>${r['入居日']?esc(r['入居日'].replace(/-/g,'/')):''}</td><td>${esc(r['食事形態'])}</td><td style="text-align:left">${esc(r['既往歴'])}</td><td style="text-align:left">${contactsOf(r.id).map(c=>`${esc(c['種別'])}：${esc(c['事業所'])}${c['担当者']?' '+esc(c['担当者']):''}${c['連絡先']?' '+esc(c['連絡先']):''}`).join('<br>')}</td></tr>`).join('')+'</table>';
  } else if(mode==='notes'){
    const list=D.day.notes.slice().sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
    out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">様子・特記　${D.date.replace(/-/g,'/')}</h2><table class="grid"><tr><th>時刻</th><th>氏名</th><th>種別</th><th>内容</th><th>記入者</th></tr>`+(list.map(n=>`<tr><td>${n['時刻']||''}</td><td class="l">${esc(n['氏名'])}</td><td>${esc(n['種別'])}</td><td style="text-align:left">${esc(n['内容'])}</td><td>${esc(n['記入者'])}</td></tr>`).join('')||'<tr><td colspan="5">記録なし</td></tr>')+'</table>';
  } else if(mode==='week'){
    const rid=$('#lRes').value; const r=D.residents.find(x=>x.id===rid); if(!r) return;
    const base=new Date(D.date+'T00:00:00'); const mon=new Date(base); mon.setDate(base.getDate()-((base.getDay()+6)%7)); // 月曜はじまり
    const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; const days=[...Array(7)].map((_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
    out.innerHTML='<div class="muted">読み込み中…</div>';
    try{ const list=(await api('schedulesFrom',{from:fmt(days[0]),residentId:rid})).filter(x=>x['日付']<=fmt(days[6]));
      const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
      let h=`<div class="calsheet"><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px"><h2 style="margin:0;font-size:17px">${esc(r['氏名'])} 様　週間予定表</h2><span class="muted">${days[0].getFullYear()}年${days[0].getMonth()+1}月${days[0].getDate()}日〜${days[6].getMonth()+1}月${days[6].getDate()}日</span><span style="margin-left:auto;font-size:11px"><span class="sch nurse">訪問看護</span><span class="sch rehab">訪問リハ</span><span class="sch helper">訪問介護</span><span class="sch day">デイ</span><span class="sch manual">往診・受診・入院等</span></span></div><table class="cal week"><thead><tr>`;
      h+=days.map(d=>`<th class="${d.getDay()===0?'sun':d.getDay()===6?'sat':''}">${d.getMonth()+1}/${d.getDate()}（${WD[d.getDay()]}）</th>`).join('')+'</tr></thead><tbody><tr>';
      for(const d of days){ const ds=fmt(d); const evs=list.filter(x=>x['日付']===ds).sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始'])));
        h+=`<td class="${ds===todayStr()?'today':''}">`+evs.map(e=>`<div class="ev ${schCls(e)}"><span class="t">${e['開始']||''}${e['終了']?'-'+e['終了']:''}</span>${esc(e['開始']?fmtSch(e).replace(/^\S+\s/,''):fmtSch(e))}</div>`).join('')+'</td>'; }
      out.innerHTML=h+'</tr></tbody></table><div class="legend">「今日の予定/食事」タブの日付を動かすと週が変わります。印刷は右上の「印刷」。</div></div>';
    }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
  } else if(mode==='cal'||mode==='calall'){
    const ym=D.date.slice(0,7); const [y,mo]=ym.split('-').map(Number); const days=new Date(y,mo,0).getDate();
    out.innerHTML='<div class="muted">読み込み中…</div>';
    try{
      if(mode==='cal'){
        const rid=$('#lRes').value; const r=D.residents.find(x=>x.id===rid); if(!r) return;
        const m={schedules:(await api('schedulesFrom',{from:ym+'-01',residentId:rid})).filter(s=>s['日付'].startsWith(ym))}; const by={};
        for(const s of m.schedules){ const d=+s['日付'].slice(8); (by[d]=by[d]||[]).push({start:s['開始'],end:s['終了'],cls:schCls(s),text:fmtSch(s).replace(/^\S+\s/,'')}); }
        out.innerHTML=calendarHtml(ym,by,`${esc(r['氏名'])} 様　予定表`,`（${m.schedules.length}件）`,'<span class="sch nurse">訪問看護</span><span class="sch rehab">訪問リハ</span><span class="sch helper">訪問介護</span><span class="sch day">デイ</span><span class="sch manual">往診・受診・入院等</span>');
      } else {
        const list=await api('schedulesFrom',{from:ym+'-01'}); const sch=list.filter(s=>s['日付'].startsWith(ym));
        let h=`<h2 style="font-size:15px;margin:0 0 6px">予定一覧　${y}年${mo}月</h2><table class="grid stk1"><tr><th style="width:70px">日</th>`+D.residents.map(r=>`<th>${esc(r['氏名'])}</th>`).join('')+'</tr>';
        for(let d=1;d<=days;d++){ const ds=`${ym}-${pad(d)}`; const dow=new Date(y,mo-1,d).getDay();
          h+=`<tr><td style="color:${dow===0?'#c0392b':dow===6?'#1d4ed8':'inherit'}">${d}(${WD[dow]})</td>`+D.residents.map(r=>`<td style="text-align:left">${sch.filter(s=>s['日付']===ds&&s['利用者ID']===r.id).sort((a,b)=>(a['開始']||'').localeCompare(b['開始']||'')).map(s=>`<span class="sch ${schCls(s)}">${esc(fmtSch(s))}</span>`).join('')}</td>`).join('')+'</tr>'; }
        out.innerHTML=h+'</table>';
      }
    }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
  } else {
    const rid=$('#lRes').value; const r=D.residents.find(x=>x.id===rid); if(!r) return; const ym=D.date.slice(0,7);
    out.innerHTML='<div class="muted">読み込み中…</div>';
    try{ const m=await api('month',{ym,residentId:rid}); const [y,mo]=ym.split('-').map(Number); const days=new Date(y,mo,0).getDate();
      const cell=x=>{ if(!x) return '<td></td>'; if(x['主食']==='注文なし') return '<td class="skip">なし</td>'; if(x['主食']==='欠') return '<td class="skip">欠</td>'; const cls=x['症状']?'sym':(+x['主食']<=5||+x['副食']<=5)?'low':''; return `<td class="${cls}">${x['主食']}/${x['副食']}${x['汁物']&&x['汁物']!=='なし'?'/'+x['汁物']:''}${x['服薬']==='済'?' 薬✓'+(x['服薬時刻']||''):x['服薬']==='未'?' 薬未':''}</td>`; };
      let h=`<h2 style="font-size:15px;margin:0 0 6px">${esc(r['氏名'])} 様　${y}年${mo}月　食事・様子記録</h2><table class="grid stk1"><tr><th>日</th><th>朝</th><th>昼</th><th>おやつ</th><th>夕</th><th>水分</th><th>症状・備考</th><th>様子・特記</th><th>他部署の記録<br><span style="font-weight:400;font-size:10.5px"><span class="xt src-nurse" style="display:inline-block;padding:0 4px">訪看</span> <span class="xt src-helper" style="display:inline-block;padding:0 4px">訪介</span> <span class="xt src-day" style="display:inline-block;padding:0 4px">デイ</span> <span class="xt src-line" style="display:inline-block;padding:0 4px">LINE</span></span></th><th>予定</th></tr>`;
      for(let d=1;d<=days;d++){ const ds=`${ym}-${pad(d)}`; const ms=m.meals.filter(x=>x['日付']===ds); const get=k=>ms.find(x=>x['食事']===k); const water=ms.reduce((a,x)=>a+(+x['水分']||0),0);
        h+=`<tr><td>${d}(${WD[new Date(y,mo-1,d).getDay()]})</td>${['朝食','昼食','おやつ','夕食'].map(k=>cell(get(k))).join('')}<td>${water||''}</td><td style="text-align:left">${ms.map(x=>[x['症状'],x['備考']].filter(Boolean).join(' ')).filter(Boolean).map(esc).join('<br>')}</td><td style="text-align:left">${m.notes.filter(n=>n['日付']===ds).map(n=>`${n['時刻']||''} ${esc(n['種別'])}:${esc(n['内容'])}`).join('<br>')}</td><td style="text-align:left">${(m.ext||[]).filter(e=>e['日付']===ds&&e['利用者ID']===rid).map(extCell).join('')}</td><td style="text-align:left">${m.schedules.filter(s=>s['日付']===ds).map(s=>esc(fmtSch(s))).join('<br>')}</td></tr>`; }
      out.innerHTML=h+'</table>';
    }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
  }
}

// ===== 予定 =====
function fillSchRes(){ const o=D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join(''); $('#sRes').innerHTML=o+'<option value="">アロハハウス（全員）</option><option value="day">アロハデイ（その日デイに行く方）</option>'; $('#sRes').onchange=()=>{ if($('#sRes').value==='day'){ $('#sKind').value='デイ'; } }; $('#sListRes').innerHTML='<option value="">全員</option>'+o; }
(function(){ const s=$('#sDay'); for(let d=1;d<=31;d++) s.innerHTML+=`<option value="${d}">${d}日</option>`; $('#sDate').value=todayStr(); })();
function updRule(){ const v=$('#sRule').value; $$('.mform label[class*="r-"]').forEach(l=>l.classList.toggle('hide',!l.classList.contains('r-'+v))); }
$('#sRule').onchange=updRule; updRule();
function expandRule(rule){ // 今日から3か月先まで
  const out=[]; const start=new Date(); start.setHours(0,0,0,0); const end=new Date(start); end.setMonth(end.getMonth()+((rule.type==='monthly'||rule.type==='nthdow')?12:3));
  const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if(rule.type==='once') return [rule.date];
  const from=rule.from?new Date(rule.from+'T00:00:00'):start; const to=rule.to?new Date(rule.to+'T00:00:00'):end;
  for(let d=new Date(Math.max(from, rule.type==='range'?from:start)); d<=to && d<=end; d.setDate(d.getDate()+1)){
    const dow=d.getDay();
    if(rule.type==='weekly'&&dow===+rule.dow) out.push(fmt(d));
    else if(rule.type==='biweekly'&&dow===+rule.dow){ const a=new Date(rule.anchor+'T00:00:00'); const wk=Math.floor(Math.round((d-a)/86400000)/7); if(d>=a&&wk%2===0) out.push(fmt(d)); }
    else if(rule.type==='monthly'&&d.getDate()===+rule.day) out.push(fmt(d));
    else if(rule.type==='nthdow'&&dow===+rule.dow){ const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); if(rule.nth==='last'?d.getDate()+7>last:Math.ceil(d.getDate()/7)===+rule.nth) out.push(fmt(d)); }
    else if(rule.type==='range') out.push(fmt(d));
  }
  return out;
}
$('#sAdd').onclick=async()=>{
  const rid=$('#sRes').value; const r=rid===''?{id:'','氏名':'アロハハウス'}:rid==='day'?{id:'','氏名':'アロハデイ'}:D.residents.find(x=>x.id===rid); if(!r) return toast('利用者を選んでください'); if(rid==='day') $('#sKind').value='デイ';
  const type=$('#sRule').value; const rule={type,date:$('#sDate').value,dow:$('#sDow').value,nth:$('#sNth').value,anchor:$('#sAnchor').value,day:$('#sDay').value,from:$('#sFrom').value,to:$('#sTo').value};
  if(type==='once'&&!rule.date) return toast('日付を入れてください');
  if(type==='biweekly'){ if(!rule.anchor) return toast('初回の日付を入れてください'); if(new Date(rule.anchor+'T00:00:00').getDay()!==+rule.dow) return toast('初回の日付の曜日が違います'); rule.from=rule.from||rule.anchor; }
  if(type==='range'&&!rule.from) return toast('開始日を入れてください');
  const dates=expandRule(rule); if(!dates.length) return toast('該当する日がありません');
  const kind=$('#sKind').value, text=$('#sText').value.trim();
  const rows=dates.map(d=>({'日付':d,'利用者ID':rid==='day'?'':rid,'氏名':r['氏名'],'種別':kind,'開始':$('#sStart').value,'終了':$('#sEnd').value,'内容':type==='range'?text+`（${rule.from.slice(5).replace('-','/')}～${rule.to?rule.to.slice(5).replace('-','/'):''}）`:text,'担当':'','出所':'手入力'}));
  const btn=$('#sAdd'), sm=$('#sMsg'); if(btn.disabled) return; // 連打防止
  btn.disabled=true; btn.textContent='登録中…'; sm.style.color='#1f7a3a'; sm.textContent='';
  try{ busy(true); const res=await api('addSchedules',{rows}); const n=res&&res.added!=null?res.added:dates.length; const sk=res&&res.skipped?`（同じ予定が${res.skipped}件あったので飛ばしました）`:''; sm.textContent=`✓ ${r['氏名']}：${n}件 登録しました${sk}`; toast(`${n}件登録しました`); $('#sText').value=''; loadSchList(); if(dates.includes(D.date)) loadDay(); }
  catch(e){ sm.style.color='#c0392b'; sm.textContent='⚠ 登録できませんでした: '+e.message; toast('失敗: '+e.message); }
  finally{ busy(false); btn.disabled=false; btn.textContent='登録'; }
};
// 拡張機能の同期画面を開くボタン（IDはこの端末に保存。既定は事務所PCのID）
(function(){ const DEF='dnamjejphndliflbofjgekcnfclnhkcd'; const inp=$('#extId'), a=$('#extOpen'); if(!inp||!a) return; inp.value=LS('hc_ext_id')||DEF; const upd=()=>{ const id=inp.value.trim()||DEF; a.href='chrome-extension://'+id+'/sync.html'; }; upd(); inp.onchange=()=>{ LSs('hc_ext_id',inp.value.trim()); upd(); }; a.onclick=e=>{ upd(); if(!/Chrome/.test(navigator.userAgent)||/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)){ e.preventDefault(); toast('この画面はパソコンのChrome（拡張機能を入れたもの）で開いてください'); return; } const id=inp.value.trim()||DEF; if(window.chrome&&chrome.runtime&&chrome.runtime.sendMessage){ e.preventDefault(); try{ chrome.runtime.sendMessage(id,{type:'openSync'},r=>{ if(chrome.runtime.lastError||!r||!r.ok){ window.open(a.href,'_blank'); } }); }catch(err){ window.open(a.href,'_blank'); } } }; })();
$('#sReload').onclick=loadSchList; $('#sListRes').onchange=loadSchList;
async function loadSchList(){
  const out=$('#sList'); out.innerHTML='<div class="muted">読み込み中…</div>';
  try{ const from=D.date.slice(0,7)+'-01'; const list=(await api('schedulesFrom',{from,residentId:$('#sListRes').value,raw:1})).sort((a,b)=>(a['日付']+a['開始']).localeCompare(b['日付']+b['開始']));
    window._schList=list; if(!window._schOpen) window._schOpen={};
    // 手入力のグループ（同時登録）はまとめて表示。「個別」を押すと1日ずつに開ける
    const groups=new Map(); for(const s of list){ const g=s['出所']==='手入力'?s.id.split('-')[0]:s.id; if(!groups.has(g)) groups.set(g,{first:s,items:[]}); groups.get(g).items.push(s); }
    const rowHtml=(s,grp)=>`<tr data-row="${s.id}"><td class="l">${dateLabel(s['日付'])}${grp?`〜 ${grp}日分`:''}</td><td class="l">${esc(s['氏名'])}</td><td class="l" style="white-space:normal">${s['開始']?s['開始']+(s['終了']?'-'+s['終了']:'')+' ':''}${esc(s['種別'])} ${esc(s['内容'])} ${esc(s['担当'])}</td><td>${esc(s['出所'])}</td><td style="white-space:nowrap">${grp?`<button class="btn" style="padding:2px 8px;font-size:11px" data-open="${s.id.split('-')[0]}">個別</button> `:`<button class="btn" style="padding:2px 8px;font-size:11px" data-edit="${s.id}">変更</button> `}<button class="btn danger" style="padding:2px 8px;font-size:11px" data-g="${grp?s.id.split('-')[0]:''}" data-id="${s.id}">削除</button></td></tr>`;
    out.innerHTML=list.length?`<table class="grid"><tr><th>日付</th><th>氏名</th><th>予定</th><th>出所</th><th></th></tr>`+[...groups.entries()].map(([g,gr])=>{ const n=gr.items.length; if(n>1&&!window._schOpen[g]) return rowHtml(gr.first,n); return gr.items.map(s=>rowHtml(s,0)).join(''); }).join('')+'</table><div class="muted" style="margin-top:4px">カイポケやLINEから入った予定も「変更」「削除」できます。変更・削除した予定は次の取り込みで戻りません。</div>':'<div class="muted">予定はありません</div>';
    $$('#sList [data-open]').forEach(b=>b.onclick=()=>{ window._schOpen[b.dataset.open]=true; loadSchList(); });
    $$('#sList [data-id]').forEach(b=>b.onclick=async()=>{ const grp=b.dataset.g; if(!confirm(grp?'この繰り返し予定をまとめて削除しますか？（1日だけ消すときは「個別」で開いてから）':'この予定を削除しますか？')) return; b.disabled=true; try{ await api('deleteSchedule',{id:b.dataset.id,group:grp||undefined}); toast('削除しました'); }catch(e){ toast('失敗: '+e.message); } loadSchList(); loadDay(); });
    $$('#sList [data-edit]').forEach(b=>b.onclick=()=>schEditRow(b.dataset.edit));
  }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
}
// 予定1件の変更フォーム（その行を入力欄に置き換える）
function schEditRow(id){
  const s=(window._schList||[]).find(x=>x.id===id); const tr=$(`#sList tr[data-row="${id}"]`); if(!s||!tr) return;
  const kinds=['訪看','訪リハ','訪介','デイ','往診','受診','入院','退院','外出','面会','行事','その他']; if(!kinds.includes(s['種別'])) kinds.unshift(s['種別']);
  tr.innerHTML=`<td colspan="5" style="text-align:left;background:#fffbe6"><div class="mform" style="grid-template-columns:repeat(3,1fr)">
    <label>日付<input type="date" id="se_d" value="${esc(s['日付'])}"></label><label>開始<input type="time" id="se_s" value="${esc(s['開始'])}"></label><label>終了<input type="time" id="se_e" value="${esc(s['終了'])}"></label>
    <label>種別<select id="se_k">${kinds.map(k=>`<option ${k===s['種別']?'selected':''}>${esc(k)}</option>`).join('')}</select></label><label class="w" style="grid-column:span 2">内容<input type="text" id="se_c" value="${esc(s['内容'])}"></label>
    <label>担当<input type="text" id="se_t" value="${esc(s['担当'])}"></label>
    <div style="grid-column:span 2;display:flex;gap:6px;align-items:end"><button class="btn pri" id="se_ok">保存</button><button class="btn" id="se_no">やめる</button><span class="muted" id="se_msg"></span></div></div></td>`;
  $('#se_no').onclick=()=>loadSchList();
  $('#se_ok').onclick=async()=>{ const btn=$('#se_ok'); if(btn.disabled) return; btn.disabled=true; $('#se_msg').textContent='保存中…';
    try{ await api('updateSchedule',{id,'日付':$('#se_d').value,'開始':$('#se_s').value,'終了':$('#se_e').value,'種別':$('#se_k').value,'内容':$('#se_c').value.trim(),'担当':$('#se_t').value.trim()}); toast('変更しました'); loadSchList(); loadDay(); }
    catch(e){ btn.disabled=false; $('#se_msg').textContent='⚠ '+e.message; } };
}
// --- カイポケ取り込み（PC） ---
(function(){ const s=$('#impYM'); const now=new Date(); for(let k=-2;k<=2;k++){ const d=new Date(now.getFullYear(),now.getMonth()+k,1); const v=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; s.innerHTML+=`<option value="${v}" ${k===0?'selected':''}>${d.getFullYear()}年${d.getMonth()+1}月</option>`; } })();
function matchResident(name){ const k=normName(name); return D.residents.find(r=>normName(r['氏名'])===k); }
async function readPdf(file){ await ensurePdf(); const buf=await file.arrayBuffer(); return pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise; }
async function importRows(rows, source, kindLabel){
  const byMonth={}; let matched=0;
  for(const r of rows){ if(!r.user) continue; const res=matchResident(r.user); if(!res) continue; matched++; const ym=r.date.slice(0,7);
    (byMonth[ym]=byMonth[ym]||[]).push({'日付':r.date,'利用者ID':res.id,'氏名':res['氏名'],'種別':kindLabel,'開始':r.start,'終了':r.end,'内容':source==='デイ'?(r.office||'').replace('サービス',''):(r.kind==='自費'?'自費 ':'')+(r.service||''),'担当':r.staff?r.staff.split(' ')[0]:''}); }
  const msgs=[];
  for(const [ym,list] of Object.entries(byMonth)){ const res=await api('importSchedules',{ym,source,rows:list}); msgs.push(`${ym}: ${res.added}件（置換${res.replaced}件）`); }
  return `${source}：入居者に一致 ${matched}件 → `+(msgs.join('、')||'保存なし');
}
$('#impNurse').onchange=async e=>{ const st=$('#impStatus'); try{ busy(true); st.textContent='読み取り中…'; let all=[]; for(const f of e.target.files){ const r=await parseNursePdf(await readPdf(f)); all=all.concat(r.rows); } st.textContent=await importRows(all,'訪看','訪看'); loadDay(); }catch(err){ st.textContent='エラー: '+err.message; } finally{ busy(false); e.target.value=''; } };
$('#impHelper').onchange=async e=>{ const st=$('#impStatus'); try{ busy(true); st.textContent='読み取り中…'; const f=e.target.files[0]; const buf=await f.arrayBuffer(); let text; try{ text=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(x){ text=new TextDecoder('shift_jis').decode(buf); } const [y,m]=$('#impYM').value.split('-').map(Number); const r=parseHelperCsv(text,y,m); st.textContent=await importRows(r.rows,'訪介','訪介'); loadDay(); }catch(err){ st.textContent='エラー: '+err.message; } finally{ busy(false); e.target.value=''; } };
$('#impDay').onchange=async e=>{ const st=$('#impStatus'); try{ busy(true); st.textContent='読み取り中…'; let all=[]; for(const f of e.target.files){ const r=await parseDayPdf(await readPdf(f)); all=all.concat(r.rows); } st.textContent=await importRows(all,'デイ','デイ'); loadDay(); }catch(err){ st.textContent='エラー: '+err.message; } finally{ busy(false); e.target.value=''; } };

// ===== 介護記録PDF・LINE 取り込み =====
(function(){ for(const s of [$('#extYM'),$('#lineYM')]){ const now=new Date(); for(let k=-3;k<=1;k++){ const d=new Date(now.getFullYear(),now.getMonth()+k,1); const v=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; s.innerHTML+=`<option value="${v}" ${k===0?'selected':''}>${d.getFullYear()}年${d.getMonth()+1}月</option>`; } } })();
$('#impKiroku').onchange=async e=>{
  const st=$('#extStatus'); const ym=$('#extYM').value; const logUser=$('#logUser').value;
  try{ busy(true); st.textContent='PDFを読み取り中…（枚数が多いと1〜2分かかります）';
    const results=[]; for(const f of e.target.files){ results.push(await parseKirokuDoc(await readPdf(f))); }
    const {own,diary,staffCounts,pages}=buildExtRows(results,{residents:D.residents,ym,logUser});
    if(!own.length&&!diary.length) throw new Error(`${pages}ページ読みましたが、対象月(${ym})の入居者・ハウス日誌の記録が見つかりませんでした。対象月とPDFの種類を確認してください`);
    st.textContent='保存中…';
    const a=await api('importExt',{key:ym+'|介護記録',rows:own}); const b=await api('importExt',{key:ym+'|ハウス日誌',rows:diary});
    const addedStaff=await mergeStaff(staffCandidates(staffCounts,D.staff));
    stampImport(['介護記録']);
    st.textContent=`${pages}ページ → 入居者本人の記録 ${a.added}件、ハウス日誌 ${b.added}件（うち全体扱い ${diary.filter(x=>!x['利用者ID']).length}件）を保存しました`+(addedStaff?`。記録者 ${addedStaff}名を記入者に追加しました`:'');
    loadDay(); loadExtList();
  }catch(err){ st.textContent='エラー: '+err.message; console.error(err); } finally{ busy(false); e.target.value=''; }
};
async function importLineFile(f, st, ym){
  const [y,m]=ym.split('-').map(Number);
  // 進み具合を「⏳ 何をしているか（経過秒）」で見せる（AIの整理とGASの保存で1〜2分かかることがある）
  const t0=Date.now(); let curStep=''; const tick=()=>{ if(curStep) st.innerHTML=`<span style="font-weight:700;color:#7a5a00">⏳ ${esc(curStep)}</span> <span class="muted">（${Math.round((Date.now()-t0)/1000)}秒経過）</span>`; }; const tm=setInterval(tick,1000); const step=x=>{ curStep=x; tick(); };
  try{ busy(true); step('トーク履歴を読み込み中'); const text=new TextDecoder('utf-8').decode(await f.arrayBuffer());
    const parsed=parseLine(text); const all=parsed.filter(g=>g.y===y&&g.m===m);
    const names=D.residents.map(r=>r['氏名']); const sns=names.map(surnameOf).filter(s=>s.length>=2);
    // 前回どこまで読んだか（月ごとのカーソル）。最後に読んだ投稿を探して、その続きだけ対象にする
    const gProf=k=>{ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']===k); if(!r) return null; try{ return JSON.parse(r['値']); }catch(e){ return null; } }; const sProf=async(k,v)=>{ await api('saveProfile',{residentId:'',key:k,value:v}); D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===''&&p['キー']===k)); D.profiles.push({'利用者ID':'','キー':k,'値':JSON.stringify(v)}); };
    const redo=$('#lineRedo')&&$('#lineRedo').checked; const curKey='line_cursor:'+ym; const cur=redo?null:gProf(curKey);
    const sig=g=>`${g.y}-${pad(g.m)}-${pad(g.d)} ${g.time||''} ${(g.sender||'')}|${String(g.text).slice(0,120)}`;
    let start=0;
    if(cur&&cur.last){ let idx=-1; for(let k=Math.min(cur.n||all.length,all.length)-1;k>=0;k--){ if(sig(all[k])===cur.last){ idx=k; break; } } if(idx<0) idx=all.findIndex(g=>sig(g)===cur.last); if(idx>=0) start=idx+1; else if(cur.lastAt){ start=all.findIndex(g=>`${g.y}-${pad(g.m)}-${pad(g.d)} ${g.time||''}`>cur.lastAt); if(start<0) start=all.length; } }
    const fresh=all.slice(start);
    const picked=fresh.filter(g=>{ const t=g.text; if(/^(画像|動画|スタンプ|\[投票|\[投票終了|.*をグループに追加しました。?$|メッセージの送信を取り消しました)/.test(t)) return false; if(/https?:\/\//.test(t)&&t.length<80) return false; return sns.some(s=>t.indexOf(s)>=0) || RE_HOUSE_KW.test(t) || /オンコール/.test(g.sender||''); })
      .map(g=>({date:`${g.y}-${pad(g.m)}-${pad(g.d)}`,time:g.time,sender:g.sender,text:g.text.slice(0,600)}));
    if(!all.length){ const months=[...new Set(parsed.map(g=>`${g.y}-${pad(g.m)}`))].sort(); throw new Error(`${ym}の投稿がありません（このファイルにある月：${months.slice(-6).join('、')}）`); }
    const saveCursor=async()=>{ const last=all[all.length-1]; await sProf(curKey,{n:all.length,last:sig(last),lastAt:`${last.y}-${pad(last.m)}-${pad(last.d)} ${last.time||''}`,at:new Date().toISOString()}); };
    if(!fresh.length){ curStep=''; st.textContent=`前回（${all.length}通目まで）以降の新しい投稿はありません`; return; }
    if(!picked.length){ await saveCursor(); curStep=''; st.textContent=`新しい投稿${fresh.length}通に入居者に関するものはありませんでした（次回はこの続きから読みます）`; return; }
    const msg=start>0?`${ym}のLINE投稿 新着${fresh.length}通のうち ${picked.length}通をAIで抽出します（前回の続き。既存の抽出は残します）。よろしいですか？`:`${ym}のLINE投稿 ${all.length}通のうち ${picked.length}通をAIで抽出します。よろしいですか？（既にある${ym}のLINE抽出は置き換えます）`;
    if(!confirm(msg)) { curStep=''; st.textContent='中止しました'; return; }
    const CH=60; let total=0, totalDiary=0, totalSch=0, totalMeals=0; const byName=new Map(D.residents.map(r=>[normName(r['氏名']),r]));
    const nchunk=Math.ceil(picked.length/CH);
    for(let i=0;i<picked.length;i+=CH){ const ci=Math.floor(i/CH)+1; const pre=nchunk>1?`（${ci}/${nchunk}回目）`:'';
      step(`AIが投稿を整理中 ${Math.min(i+CH,picked.length)}/${picked.length}通${pre}…30秒〜1分ほどかかります`);
      const res=await api('extractLine',{residents:names,messages:picked.slice(i,i+CH)});
      step(`記録を保存中${pre}`);
      const rows=res.items.map(it=>{ const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'時刻':it.time,'利用者ID':r.id,'氏名':r['氏名'],'種別':it.kind,'内容':it.content,'記録者':'','出所':'LINE'}:null; }).filter(Boolean).filter(r=>r['日付'].slice(0,7)===ym);
      // ハウス全体の出来事（地震・設備・オンコールの全体報告など）は利用者IDなしの行として保存し、今日の予定カードと「この日の全員」に表示
      (res.house||[]).forEach(it=>{ if(String(it.date||'').slice(0,7)===ym) rows.push({'日付':it.date,'時刻':it.time,'利用者ID':'','氏名':'（全体）','種別':it.kind||'','内容':it.text,'記録者':'','出所':'LINE'}); });
      await api('importExt',{key:ym+'|LINE',rows,append:start>0||i>0}); total+=rows.length;
      // 個人日誌
      const drows=(res.diary||[]).map(it=>{ const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'時刻':it.time,'利用者ID':r.id,'氏名':r['氏名'],'種別':it.kind,'内容':it.text,'記入者':'LINE','出所':'LINE'}:null; }).filter(Boolean).filter(r=>r['日付'].slice(0,7)===ym);
      if(drows.length){ step(`日誌を保存中${pre}`); await api('importDiary',{key:ym+'|LINE',rows:drows,append:start>0||i>0}); totalDiary+=drows.length; }
      // 予定（入居者個人／アロハハウス全体）：追加のみ
      const kindMap=k=>({'訪看':'訪看','訪介':'訪介','受診':'受診','往診':'往診','入院':'入院','退院':'退院','面会':'面会','外出':'外出','行事':'行事','業者':'業者','会議':'会議'})[k]||'その他';
      const srows=(res.schedules||[]).map(it=>{ if(it.resident==='アロハハウス') return {'日付':it.date,'利用者ID':'','氏名':'アロハハウス','種別':kindMap(it.kind),'開始':it.time||'','終了':'','内容':it.content,'担当':''}; const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'利用者ID':r.id,'氏名':r['氏名'],'種別':kindMap(it.kind),'開始':it.time||'','終了':'','内容':it.content,'担当':''}:null; }).filter(Boolean);
      const byYm={}; srows.forEach(r=>{ (byYm[r['日付'].slice(0,7)]=byYm[r['日付'].slice(0,7)]||[]).push(r); });
      for(const [sym,list] of Object.entries(byYm)){ step(`予定を保存中${pre}`); const a=await api('importSchedules',{ym:sym,source:'LINE',rows:list,append:true}); totalSch+=a.added; }
      // 食事量（「完食」など）→ 食事記録へ（職員が入力済みのものは上書きしない）
      const mrows=(res.meals||[]).map(it=>{ const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'利用者ID':r.id,'氏名':r['氏名'],'食事':it.meal,'主食':it.staple,'副食':it.side,'汁物':it.soup,'水分':it.water,'症状':it.sym||'','備考':'LINEより'}:null; }).filter(Boolean);
      if(mrows.length){ step(`食事記録を保存中${pre}`); try{ const a=await api('autoMeals',{rows:mrows,source:'LINE'}); totalMeals+=a.saved||0; }catch(e){} }
    }
    step('仕上げ中'); await saveCursor(); stampImport(['LINE']); curStep='';
    st.innerHTML=`<span style="font-weight:700;color:#1f7a3a">✓ 完了</span>　LINE ${start>0?'新着':''}${picked.length}通 → 記録${total}件・日誌${totalDiary}件・予定${totalSch}件・食事${totalMeals}件を保存しました（${Math.round((Date.now()-t0)/1000)}秒）。日誌タブと予定タブで確認し、違うものは削除してください`;
    loadDay(); if($('#p-set').classList.contains('on')) loadExtList();
  }catch(err){ curStep=''; st.innerHTML='<span style="color:#b3261e;font-weight:700">⚠ エラー</span> '+esc(err.message); console.error(err); } finally{ clearInterval(tm); busy(false); }
}
if($('#impLine')) $('#impLine').onchange=async e=>{ const f=e.target.files[0]; if(f) await importLineFile(f,$('#extStatus'),$('#extYM').value); e.target.value=''; };
$('#impLine2').onchange=async e=>{ const f=e.target.files[0]; if(f) await importLineFile(f,$('#lineStatus'),$('#lineYM').value); e.target.value=''; if($('#lineRedo')) $('#lineRedo').checked=false; };
async function showAiStatus(){ try{ const s=await api('aiStatus'); $('#aiStatus').textContent=s.hasKey?`設定済み（${s.keyHint}）`:'未設定'; }catch(e){ $('#aiStatus').textContent='確認できません（'+e.message+'）'; } }
$('#aiKeySave').onclick=async()=>{ const k=$('#aiKey').value.trim(); if(!k) return toast('APIキーを入れてください'); if(!/^sk-ant-/.test(k)&&!confirm('sk-ant- で始まっていません。このまま保存しますか？')) return; try{ busy(true); const s=await api('setApiKey',{key:k}); $('#aiKey').value=''; $('#aiStatus').textContent=s.hasKey?`設定済み（${s.keyHint}）`:'未設定'; toast('保存しました'); }catch(e){ toast('失敗: '+e.message); } finally{ busy(false); } };
$('#extReload').onclick=loadExtList; $('#extFilter').onchange=loadExtList;
async function loadExtList(){
  const out=$('#extList'); const ym=$('#extYM').value; const f=$('#extFilter').value; out.innerHTML='<div class="muted">読み込み中…</div>';
  try{ const keys=f?[f]:['介護記録','ハウス日誌','LINE','訪看記録','訪介記録']; let list=[]; for(const k of keys){ list=list.concat(await api('extList',{key:ym+'|'+k})); }
    list.sort((a,b)=>(a['日付']+a['時刻']).localeCompare(b['日付']+b['時刻']));
    out.innerHTML=list.length?`<table class="grid"><tr><th>日付</th><th>時刻</th><th>氏名</th><th>出所</th><th>種別</th><th>内容</th><th>記録者</th><th></th></tr>`+list.map(e=>`<tr><td>${dateLabel(e['日付'])}</td><td>${e['時刻']||''}</td><td class="l">${esc(e['氏名'])}</td><td>${esc(e['出所'])}</td><td>${esc(e['種別'])}</td><td style="text-align:left">${esc(e['内容'])}</td><td>${esc(e['記録者'])}</td><td><button class="btn danger" style="padding:2px 8px;font-size:11px" data-x="${e.id}">削除</button></td></tr>`).join('')+'</table>':'<div class="muted">取込記録はありません</div>';
    $$('#extList [data-x]').forEach(b=>b.onclick=async()=>{ await api('deleteExt',{id:b.dataset.x}); b.closest('tr').remove(); loadDay(); });
  }catch(e){ out.innerHTML='読み込み失敗: '+esc(e.message); }
}

// ===== 設定 =====
$('#cfgSave').onclick=async()=>{ cfg.url=$('#cfgUrl').value.trim(); cfg.token=$('#cfgToken').value.replace(/[\s\u3000]+/g,''); LSs('hc_url',cfg.url); LSs('hc_token',cfg.token); CKs('hc_url',cfg.url); CKs('hc_token',cfg.token); $('#cfgStatus').textContent='接続中…'; try{ await api('ping'); $('#cfgStatus').textContent='接続OK'; await boot(); }catch(e){ $('#cfgStatus').textContent='接続できません: '+e.message; } };
async function doLogin(){ const pw=$('#loginPw').value.trim(); if(!pw) return; $('#loginMsg').textContent='確認中…'; try{ const r=await api('login',{pw}); LSs('hc_login',String(r.until||Date.now()+30*86400000)); CKs('hc_login',String(r.until||Date.now()+30*86400000)); $('#loginGate').classList.add('hide'); $('#loginPw').value=''; $('#loginMsg').textContent=''; await boot(); }catch(e){ $('#loginMsg').textContent=e.message; } }
$('#loginBtn').onclick=doLogin; $('#loginPw').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
$('#pwSave').onclick=async()=>{ const cur=$('#pwCur').value, nw=$('#pwNew').value.trim(); if(nw.length<6) return toast('6文字以上にしてください'); try{ busy(true); await api('setLoginPassword',{current:cur,pw:nw}); $('#pwStatus').textContent='変更しました。他の端末は次に開くとき新しいパスワードが必要です'; $('#pwCur').value=''; $('#pwNew').value=''; }catch(e){ $('#pwStatus').textContent='変更できません: '+e.message; } finally{ busy(false); } };
$('#logoutBtn').onclick=()=>{ localStorage.removeItem('hc_login'); CKs('hc_login','0'); location.reload(); };
$('#cfgLink').onclick=async()=>{ const c={url:$('#cfgUrl').value.trim(),token:$('#cfgToken').value}; if(!c.url) return toast('先にURLを入れてください'); const link=location.origin+location.pathname+'?s='+encCfg(c); /* LINEから開くと #以降が落ちることがあるので ?s= にする */ try{ await navigator.clipboard.writeText(link); $('#cfgStatus').textContent='設定リンクをコピーしました（LINEやメールで自分に送って、他の端末で開いてください）'; }catch(e){ prompt('このリンクをコピーしてください',link); } };
$('#formsText').onchange=()=>{ D.forms=$('#formsText').value.split(/[,、，]/).map(s=>s.trim()).filter(Boolean); LSs('hc_forms',D.forms.join(',')); renderStaffSel(); };
let editRes=[];
function renderResTable(){
  editRes=D.allResidents.map(r=>({...r}));
  const t=$('#resTable');
  t.innerHTML='<tr><th>在籍</th><th>部屋</th><th>氏名</th><th>ふりがな</th><th>入居日</th><th>食事形態</th><th>既往歴</th><th>メモ</th></tr>'+editRes.map((r,i)=>`<tr><td><input type="checkbox" data-i="${i}" data-k="在籍" ${r['在籍']!=='0'?'checked':''}></td><td><input type="text" data-i="${i}" data-k="部屋" value="${esc(r['部屋'])}" style="width:60px;padding:4px"></td><td><input type="text" data-i="${i}" data-k="氏名" value="${esc(r['氏名'])}" style="width:120px;padding:4px"></td><td><input type="text" data-i="${i}" data-k="ふりがな" value="${esc(r['ふりがな'])}" style="width:120px;padding:4px"></td><td><input type="date" data-i="${i}" data-k="入居日" value="${esc(r['入居日']||'')}" style="width:140px;padding:4px"></td><td><input type="text" data-i="${i}" data-k="食事形態" list="formList" value="${esc(r['食事形態'])}" style="width:90px;padding:4px"></td><td><input type="text" data-i="${i}" data-k="既往歴" value="${esc(r['既往歴']||'')}" style="width:180px;padding:4px"></td><td><input type="text" data-i="${i}" data-k="メモ" value="${esc(r['メモ'])}" style="width:120px;padding:4px"></td></tr>`).join('')+`<datalist id="formList">${D.forms.map(f=>`<option value="${esc(f)}">`).join('')}</datalist>`;
  t.oninput=e=>{ const el=e.target; if(!el.dataset.k) return; editRes[+el.dataset.i][el.dataset.k]=el.type==='checkbox'?(el.checked?'1':'0'):el.value; };
}
$('#resAdd').onclick=()=>{ D.allResidents=editRes.concat([{id:'',氏名:'',ふりがな:'',部屋:'',食事形態:'',在籍:'1',メモ:''}]); renderResTable(); };
$('#resSave').onclick=async()=>{ const list=editRes.filter(r=>r['氏名'].trim()); try{ busy(true); const saved=await api('saveResidents',{residents:list}); D.allResidents=saved; D.residents=saved.filter(r=>r['在籍']!=='0'); renderResTable(); toast('保存しました'); renderToday(); }catch(e){toast('失敗: '+e.message);} finally{busy(false);} };
async function mergeStaff(add){
  if(!add.length) return 0;
  D.staff=D.staff.concat(add); await api('saveStaff',{names:D.staff}); $('#staffText').value=D.staff.join('\n'); renderStaffSel(); return add.length;
}
$('#staffFromExt').onclick=async()=>{ try{ busy(true); const ym=$('#extYM').value; let list=[]; for(const k of ['介護記録','ハウス日誌']) list=list.concat(await api('extList',{key:ym+'|'+k})); const cnt={}; for(const e of list){ const n=cleanRecorder(e['記録者']); if(n) cnt[n]=(cnt[n]||0)+1; } const n=await mergeStaff(staffCandidates(cnt,D.staff)); toast(n?`${n}名を記入者に追加しました`:'追加する記録者はありませんでした（取り込み月を確認）'); }catch(e){toast('失敗: '+e.message);} finally{busy(false);} };
$('#staffSave').onclick=async()=>{ const names=$('#staffText').value.split(/\n/).map(s=>s.trim()).filter(Boolean); try{ await api('saveStaff',{names}); D.staff=names; renderStaffSel(); toast('保存しました'); }catch(e){toast('失敗: '+e.message);} };
$('#resCsv').onchange=async e=>{
  const f=e.target.files[0]; if(!f) return; const buf=await f.arrayBuffer(); let text; try{ text=new TextDecoder('utf-8',{fatal:true}).decode(buf); }catch(x){ text=new TextDecoder('shift_jis').decode(buf); }
  const table=parseCsvText(text.replace(/^﻿/,'')); if(table.length<2) return toast('読み取れません');
  const head=table[0].map(s=>s.trim()); const find=(...keys)=>head.findIndex(h=>keys.some(k=>h.includes(k)));
  let iN=find('利用者氏名','利用者名','氏名','名前'); const iK=find('利用者カナ','カナ','かな','ふりがな','フリガナ'); const iSei=find('姓'), iMei=find('名'); const iB=find('建物名'), iA=find('町名以下'); const iSex=find('性別'), iBirth=find('生年月日'); // ※口座・銀行の列は読まない
  if(iN<0&&iSei<0) return toast('氏名の列が見つかりません（先頭行: '+head.slice(0,6).join(', ')+'）');
  const HOUSE=/アロハハウス|森野\s*4[-‐－ー]?17[-‐－ー]?17|森野4丁目.?17番.?17/;
  const cands=[]; for(const row of table.slice(1)){ let name=iN>=0?row[iN]:((row[iSei]||'')+' '+(row[iMei]||'')); name=(name||'').trim(); if(!name) continue; const bld=iB>=0?(row[iB]||''):'', adr=iA>=0?(row[iA]||''):''; const isHouse=(iB>=0||iA>=0)?HOUSE.test(bld+' '+adr):true; const rm=(bld.match(/(\d{3})/)||[])[1]||''; cands.push({name,kana:iK>=0?(row[iK]||''):'',isHouse,room:rm,sex:iSex>=0?(row[iSex]||'').trim():'',birth:iBirth>=0?(row[iBirth]||'').trim().replace(/\//g,'-'):''}); }
  const house=cands.filter(c=>c.isHouse);
  const useOnlyHouse = house.length && house.length<cands.length ? confirm(`${cands.length}名のうち、住所がアロハハウスの方は ${house.length}名です。\n${house.map(c=>c.name+(c.room?'('+c.room+')':'')).join('、')}\n\nこの${house.length}名だけを入居者として追加しますか？（キャンセル＝全員を追加）`) : false;
  let added=0, upd=0; const items=[];
  for(const c of cands){ // 既存の方は住所に関係なく補完、新規はアロハハウス住所の方だけ
    const ex=editRes.find(r=>normName(r['氏名'])===normName(c.name));
    if(!ex&&useOnlyHouse&&!c.isHouse) continue;
    if(ex){ // すでにいる方：ふりがな・性別・生年月日が空なら埋める
      let ch=false; if(!ex['ふりがな']&&c.kana){ ex['ふりがな']=c.kana; ch=true; }
      if(ex.id&&(c.sex||c.birth)){ const pr=(D.profiles||[]).find(p=>p['利用者ID']===ex.id&&p['キー']==='basic'); let b={}; try{ b=pr?JSON.parse(pr['値'])||{}:{}; }catch(x){ b={}; }
        if((!b.sex&&c.sex)||(!b.birth&&c.birth)){ if(!b.sex&&c.sex) b.sex=c.sex; if(!b.birth&&c.birth) b.birth=c.birth; items.push({residentId:ex.id,key:'basic',value:b}); ch=true; } }
      if(ch) upd++; continue; }
    editRes.push({id:'',氏名:c.name,ふりがな:c.kana,部屋:c.room,食事形態:'',在籍:'1',メモ:'',入居日:'',既往歴:''}); added++; }
  D.allResidents=editRes; renderResTable();
  const st=$('#resCsvStatus'); st.textContent='保存中…';
  try{ if(items.length){ await api('saveProfile',{items}); for(const it of items){ D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===it.residentId&&p['キー']==='basic')); D.profiles.push({'利用者ID':it.residentId,'キー':'basic','値':JSON.stringify(it.value)}); } }
    if(added||editRes.some(r=>r['ふりがな'])){ const saved=await api('saveResidents',{residents:editRes.filter(r=>r['氏名'].trim())}); D.allResidents=saved; D.residents=saved.filter(r=>r['在籍']!=='0'); editRes=saved.map(r=>({...r})); renderResTable(); renderToday(); }
    st.textContent=`✓ 読み込みました：新規 ${added}名、既存の方の情報を補完 ${upd}名（ふりがな・性別・生年月日）。読み飛ばし ${cands.length-(useOnlyHouse?house.length:cands.length)}名`; toast('利用者CSVを取り込みました'); }
  catch(err){ st.textContent='⚠ 保存できませんでした: '+err.message; }
  e.target.value='';
};
// ドラッグ＆ドロップ：.drop の枠に落としたファイルを中の <input type=file> に渡す
document.addEventListener('dragover',e=>{ const d=e.target.closest&&e.target.closest('.drop'); if(d){ e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave',e=>{ const d=e.target.closest&&e.target.closest('.drop'); if(d) d.classList.remove('over'); });
document.addEventListener('drop',e=>{ const d=e.target.closest&&e.target.closest('.drop'); if(!d) return; e.preventDefault(); d.classList.remove('over'); const inp=d.querySelector('input[type=file]'); if(!inp||!e.dataTransfer.files.length) return; const dt=new DataTransfer(); for(const f of e.dataTransfer.files){ dt.items.add(f); if(!inp.multiple) break; } inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true})); });
boot();
if('serviceWorker' in navigator && location.protocol.startsWith('http')){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
