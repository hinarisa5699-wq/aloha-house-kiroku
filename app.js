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
(function(){ try{ const q=location.search+location.hash; const d=q.match(/[?#&]d=(\d{4}-\d{2}-\d{2})/); if(d) window._openDate=d[1]; const p=q.match(/[?#&]p=(diary)/); if(p) window._openPanel=p[1]; }catch(e){} })(); // ポータルの確認事項から日誌を開く
let cfg={url:LS('hc_url')||CK('hc_url')||'',token:LS('hc_token')||CK('hc_token')||''};
// スマホ・タブレット用リンク（?s=…&m=1）で開いた端末は「設定」タブを出さない（接続先はリンクに入っているので手で触る必要がない）
(function(){ if(/[?&]m=1(&|$|#)/.test(location.search)) LSs('hc_mode','m'); if(/[?&]m=0(&|$|#)/.test(location.search)){ try{ localStorage.removeItem('hc_mode'); }catch(e){} } /* m=0 でスマホ用の設定（設定タブ非表示）を解除 */ if(LS('hc_mode')==='m') document.body.classList.add('fixedcfg'); })();
(function(){ const m=(location.search+location.hash).match(/[?#&]s=([^&#]+)/); const h=m&&decCfg(m[1]); if(h){ cfg=h; } /* ?s= はURLに残す（ブラウザの保存データが消えても、リロードやブックマークで接続先が復元できるように） */ if(cfg.url){ LSs('hc_url',cfg.url); LSs('hc_token',cfg.token); CKs('hc_url',cfg.url); CKs('hc_token',cfg.token); } })();
// 業務ポータルからのリンク（?s=…&u=職員名&k=ポータル合言葉）：ポータルで個人ログイン済みの職員はパスワードなしで開き、記入者をその人にしておく
// 閲覧のみ（ハウス以外の職員・ケアマネ）：ポータルから ro=1 付きで開くと編集できない。ポータルから ro なしで開いたら解除 2026/11/22
(function(){ try{ const q=location.search+location.hash; if(/[?#&]k=/.test(q)) LSs('hc_ro',/[?#&]ro=1(&|$)/.test(q)?'1':'0'); }catch(e){} })();
const RO=()=>LS('hc_ro')==='1';
const RO_OK=/^(init|day|month|diaryList|extList|schedulesFrom|ping|login|loginPortal|aiStatus)$/;
(function(){ const q=location.search+location.hash; const mu=q.match(/[?#&]u=([^&#]+)/), mk=q.match(/[?#&]k=([^&#]+)/); if(mu&&mk){ try{ const u=decodeURIComponent(mu[1].replace(/\+/g,' ')).replace(/[\s　]+/g,''); /* 記入者リストは姓名の間にスペースなし */ LSs('hc_portal_k',decodeURIComponent(mk[1])); if(u){ LSs('hc_staff',u); LSs('hc_staff_at',String(Date.now())); } }catch(e){} } })();
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}
async function api(action, params={}){
  if(!cfg.url) throw new Error('設定でGASのURLを入れてください');
  if(RO()&&!RO_OK.test(action)){ toast('閲覧のみです（編集はハウスの職員が行います）'); throw new Error('閲覧のみです'); }
  if(action==='saveResidents'){ const n=(params.residents||[]).length, cur=(D&&D.allResidents||[]).length; if(!cur) throw new Error('入居者一覧をまだ読み込めていないので保存しません（読み込み直してください）'); if(n<cur&&!params._ok) throw new Error(`入居者が${cur}人から${n}人に減るので保存しません`); } // 一覧を消してしまう事故を防ぐ（2026/11/22）
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
if(window._openDate) D.date=window._openDate; $('#date').value=D.date;
$('#date').onchange=e=>{D.date=e.target.value;loadDay(); if($('#p-diary').classList.contains('on')) renderDiary();};
$('#dPrev').onclick=()=>shiftDate(-1); $('#dNext').onclick=()=>shiftDate(1);
function shiftDate(n){const d=new Date(D.date+'T00:00:00');d.setDate(d.getDate()+n);D.date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;$('#date').value=D.date;loadDay(); if($('#p-diary').classList.contains('on')) renderDiary(); if($('#p-list').classList.contains('on')) renderList();}
function dateLabel(s){const d=new Date(s+'T00:00:00');return `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`;}

// ===== 読み込み =====
async function boot(){ document.body.classList.toggle('ro',RO());
  $('#cfgUrl').value=cfg.url; $('#cfgToken').value=cfg.token; $('#formsText').value=D.forms.join(',');
  if(!cfg.url){ $('#todayList').innerHTML='<div class="card">はじめに「設定」でGASのURLと合言葉を入れてください。</div>'; show('set'); return; }
  if(!(+LS('hc_login')>Date.now()) && +CK('hc_login')>Date.now()) LSs('hc_login',CK('hc_login')); // ログイン期限はCookieにも控える
  if(!(+LS('hc_login')>Date.now()) && LS('hc_portal_k')){ try{ const r=await api('loginPortal',{key:LS('hc_portal_k'),staff:LS('hc_staff')||''}); if(r&&r.until){ LSs('hc_login',String(r.until)); CKs('hc_login',String(r.until)); } }catch(e){} } // ポータル経由の端末は合言葉で自動ログイン（期限切れのときも自動で延長）
  if(!(+LS('hc_login')>Date.now())){ // ログイン：まずパスワード画面をすぐ出す（サーバ側でパスワード未設定なら裏で確認して自動で通す）
    $('#loginGate').classList.remove('hide'); $('#loginPw').focus();
    api('login',{pw:''}).then(r=>{ if(r&&r.none){ LSs('hc_login',String(Date.now()+30*86400000)); $('#loginGate').classList.add('hide'); boot(); } }).catch(()=>{});
    return;
  }
  // 前回の内容をまず表示（開き直したときに「読み込み中」で待たせない）。そのあと裏で最新に更新
  const applyBoot=b=>{ D._act=b.residents; D.allResidents=b.allResidents; resFilter(); D.staff=b.staff; D.contacts=b.contacts||[]; D.profiles=b.profiles||[]; renderStaffSel(); renderResTable(); $('#staffText').value=D.staff.join('\n'); const lr=$('#lineRes'); if(lr){ const cur=lr.value; lr.innerHTML='<option value="">（入居者を選んでください）</option>'+D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join(''); lr.value=cur; } };
  try{ const cb=JSON.parse(LS('hc_cache_boot')||'null'), cd=dayCacheGet(D.date); if(cb&&cb.residents){ applyBoot(cb); if(cd){ D.day=cd; renderToday(); $('#ttl').textContent+='（更新中…）'; } } }catch(e){}
  const slow=setTimeout(()=>{ if(/読み込み中/.test($('#todayList').textContent)) $('#todayList').innerHTML='<div class="card">読み込みに時間がかかっています。通信状況を確認して、少し待つか<button class="btn" type="button" onclick="location.reload()">再読み込み</button>してください。</div>'; },15000);
  try{ busy(true); const b=await api('init',{date:D.date}); const d=b.day; delete b.day; applyBoot(b); LSs('hc_cache_boot',JSON.stringify(b)); showAiStatus(); portalKeySync().then(portalFill); if(window._openPanel==='diary'){ window._openPanel=''; $('#dMode').value='day'; show('diary'); } D.day=d; dayCachePut(D.date,d); renderToday(); loadBowel(); loadOcPrev(); if($('#p-entry').classList.contains('on')) renderEntry(); if($('#p-list').classList.contains('on')) renderList(); clearTimeout(slow); }
  catch(e){ $('#todayList').innerHTML=`<div class="card">接続できません：${e.message}<br><span class="muted">設定を確認してください</span></div>`; }
  finally{ busy(false); }
}
// 日ごとの内容を端末に控えておく（日付を切り替えたとき、まず前回の内容を出してから裏で最新に更新する）
const dayCacheGet=d=>{ try{ const m=JSON.parse(LS('hc_cache_days')||'{}'); return m[d]&&m[d].data||null; }catch(e){ return null; } };
const dayCachePut=(d,data)=>{ try{ let m=JSON.parse(LS('hc_cache_days')||'{}'); m[d]={t:Date.now(),data}; const ks=Object.keys(m).sort((x,y)=>m[y].t-m[x].t); if(ks.length>45) ks.slice(45).forEach(k=>delete m[k]); LSs('hc_cache_days',JSON.stringify(m)); }catch(e){} LSs('hc_cache_day',JSON.stringify({date:d,data})); };
let _loadSeq=0;
// 入居日より前の日は、その人を一覧に出さない（入居予定の人を先に登録しておける）2026/11/22
function resFilter(){ const act=D._act||D.residents||[]; D.activeResidents=act; D.residents=act.filter(r=>!r['入居日']||r['入居日']<=D.date); }
async function loadDay(){ resFilter();
  const seq=++_loadSeq; const want=D.date;
  const c=dayCacheGet(want); if(c){ D.day=c; renderToday(); if($('#p-entry').classList.contains('on')) renderEntry(); if($('#p-list').classList.contains('on')) renderList(); $('#ttl').textContent+='（更新中…）'; }
  try{ busy(true); const d=await api('day',{date:want}); if(seq!==_loadSeq||want!==D.date) return; D.day=d; dayCachePut(want,d); renderToday(); loadBowel(); loadOcPrev(); if($('#p-entry').classList.contains('on')) renderEntry(); if($('#p-list').classList.contains('on')) renderList(); }
  catch(e){ if(seq===_loadSeq) toast('読み込み失敗: '+e.message); } finally{ if(seq===_loadSeq) busy(false); }
}
const mealOf=(rid,meal)=>D.day.meals.find(m=>m['利用者ID']===rid&&m['食事']===meal);
const extOf=rid=>(D.day.ext||[]).filter(e=>e['利用者ID']===rid||(rid&&e['利用者ID']===''&&false)).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
// ハウス全体の記録（利用者IDなし：ハウス日誌の全体の文、LINEの地震・設備・オンコール全体報告など）
// 前の夜のオンコール報告（当番日=前日で保存）を、当番明けの朝の「予定」の下と業務日誌に出す（アロハ花子のときと同じ見え方）2026/11/25
const ocPrevExt=()=>{ const o=D.day&&D.day.ocPrev; if(!o||o.d!==D.date||!o.e) return []; const e=o.e; return [{id:e.id,'日付':D.date,'時刻':'','利用者ID':'','種別':'オンコール','内容':`（${mdJ(e['日付'])}夜の当番）`+String(e['内容']||''),'記録者':e['記入者']||'','出所':'オンコール報告'}]; };
async function loadOcPrev(){ const d=D.date; try{ const prev=addDay(d,-1); const l=await api('diaryList',{date:prev}); if(d!==D.date||!D.day) return; const e=(l||[]).find(x=>String(x.id||'')==='ocd-'+prev)||null; const was=JSON.stringify(D.day.ocPrev||null); D.day.ocPrev={d,e}; dayCachePut(d,D.day); if(was!==JSON.stringify(D.day.ocPrev)) renderToday(); }catch(er){} }
const houseExt=()=>ocPrevExt().concat((D.day.ext||[]).filter(e=>e['利用者ID']===''&&e['内容'])).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
const hxIsOC=x=>!!x&&/オンコール/.test((x['種別']||'')+(x['内容']||''));
const hxNone=x=>hxIsOC(x)&&/(なし|無し|なかった|[0０]件)/.test(String(x['内容']||''))&&!/[1-9１-９]件/.test(String(x['内容']||'')); // 「オンコールなし」には詳細ボタンを出さない
const hxBare=x=>{ const t=String(x&&x['内容']||'').replace(/【[^】]*】?/g,'').replace(/(夜間の?)?オンコール(呼び出し|対応)?(は)?\s*[0-9０-９]*\s*件(であった|だった)?[。、]?/g,'').replace(/[\s。、]/g,''); return hxIsOC(x)&&t.length<12; }; // 件数・担当だけで中身が書かれていない記録
const houseHtml=()=>{ const l=houseExt(); if(!l.length) return ''; return `<div style="margin-top:8px"><b style="font-size:13px">ハウス全体の記録</b> <span class="muted" style="font-size:11.5px">「詳細」で個人日誌に書かれた対応の記録を見られます</span>${l.map(e=>`<div class="ext ${extSrc(e)}" data-hx="${esc(e.id||'')}" style="margin-top:4px;display:flex;gap:8px;align-items:center"><div style="flex:1;min-width:0"><span class="m">${e['時刻']||''} ${esc(e['出所']==='ハウス日誌'?'ハウス日誌':e['出所'])}${e['種別']?'・'+esc(e['種別']):''}${e['記録者']?' '+esc(e['記録者']):''}</span><br>${esc(e['内容'])}</div>${hxNone(e)?'':`<button type="button" class="btn pri hx-write" data-hx="${esc(e.id||'')}" style="flex:none;padding:8px 12px">詳細</button>`}</div>`).join('')}</div>`; };
const extLabel=e=>e['出所']==='介護記録'?('デイ'+(e['種別']?'・'+e['種別']:'')):e['出所']==='訪看記録'?'訪看':e['出所']==='訪介記録'?('訪介'+(e['種別']?'・'+e['種別']:'')):(e['出所']+(e['種別']&&e['種別']!=='ケース'?'・'+e['種別']:''));
const extSrc=e=>({'訪看記録':'src-nurse','訪介記録':'src-helper','介護記録':'src-day','ハウス日誌':'src-day','LINE':'src-line'})[e['出所']]||'';
const extHtml=e=>`<div class="ext ${extSrc(e)}"><span class="m">${e['時刻']||''} ${esc(extLabel(e))}${e['記録者']?' '+esc(e['記録者']):''}</span><br>${esc(e['内容'])}</div>`;
const extCell=e=>`<span class="xt ${extSrc(e)}"><b>${e['時刻']||''} ${esc(extLabel(e))}</b>${esc(e['内容'])}</span>`;
const schOf=rid=>D.day.schedules.filter(s=>s['利用者ID']===rid).sort((a,b)=>(a['開始']||'').localeCompare(b['開始']||''));
const schCls=s=>({'訪看':'nurse','訪リハ':'rehab','訪介':'helper','デイ':'day','お金':'money'})[s['種別']]||'manual';
const kindName=k=>k==='往診'?'訪問診療':k; // 「往診」は「訪問診療」と表示（2026/11/22）
function fmtSch(s,withEnd){ const c=String(s['内容']||'').replace(/往診/g,'訪問診療'); const kn=kindName(s['種別']); const body=(c.startsWith(kn)||c.includes(kn))?c:(kn+(c?' '+c:'')); return (s['開始']?s['開始']+(withEnd&&s['終了']?'-'+s['終了']:'')+' ':'')+body+(s['担当']?' '+s['担当']:''); }
function schHtml(s){ return `<span class="sch ${schCls(s)}">${esc(fmtSch(s,true))}</span>`; }
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);}

// ===== 今日 =====
function chip(m,lb){ const L=lb?`<b class="cl">${lb}</b>`:'';
  if(!m) return `<span class="chip">${L}未</span>`;
  if(m['主食']==='注文なし') return `<span class="chip skip">${L}注文なし</span>`;
  if(m['主食']==='欠') return `<span class="chip skip">${L}欠食</span>`;
  const st=+m['主食'], sd=+m['副食']; const sym=m['症状'];
  const c=sym?'sym':(st<=5||sd<=5)?'low':'done';
  return `<span class="chip ${c}">${L}${c==='done'?'✓':''}${m['主食']}/${m['副食']}${m['汁物']&&m['汁物']!=='なし'?'/'+m['汁物']:''}${m['服薬']==='済'?' 薬✓'+(m['服薬時刻']||''):m['服薬']==='未'?' 薬未':''}</span>`;
}
// 今日の予定（全員分を時刻順に一覧）
function renderTodaySch(){
  const el=$('#todaySch'); if(!el) return;
  const ids=new Set(D.residents.map(r=>r.id)); const nm=Object.fromEntries(D.residents.map(r=>[r.id,r]));
  const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
  const HOUSE={id:'','部屋':'—','氏名':'アロハハウス'}; nm['']=HOUSE;
  const list=(D.day.schedules||[]).filter(s=>ids.has(s['利用者ID'])||s['利用者ID']==='').sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始']))||String(nm[a['利用者ID']]['部屋']).localeCompare(String(nm[b['利用者ID']]['部屋'])));
  if(!list.length){ el.innerHTML='<span class="muted">予定なし</span>'+houseHtml(); hxBind('#todaySch'); return; }
  const body=(s)=>{ const c=String(s['内容']||'').replace(/往診/g,'訪問診療'); const kn=kindName(s['種別']); return (c.startsWith(kn)||c.includes(kn))?c:(kn+(c?' '+c:'')); };
  el.innerHTML='<table class="grid" style="width:100%;font-size:13px"><tr><th style="width:92px">時間</th><th style="width:34px">部屋</th><th style="width:110px">氏名</th><th style="text-align:left">予定</th><th style="width:70px">担当</th></tr>'+list.map(s=>{ const r=nm[s['利用者ID']]; return `<tr class="${r.id?'sch-row':''}" data-id="${r.id}" style="${r.id?'cursor:pointer':'background:#fff7e6'}"><td>${s['開始']||''}${s['終了']?'-'+s['終了']:''}</td><td>${esc(r['部屋'])}</td><td class="l">${esc(r['氏名'])}</td><td style="text-align:left"><span class="sch ${schCls(s)}">${esc(body(s))}</span></td><td>${esc(s['担当']||'')}</td></tr>`; }).join('')+'</table>';
  el.insertAdjacentHTML('beforeend', houseHtml());
  $$('#todaySch .sch-row').forEach(tr=>tr.onclick=()=>openEntry(tr.dataset.id)); hxBind('#todaySch');
}
// 取り込みの実施記録（介護記録PDF・LINE）。今日まだなら「今日の予定/食事」の上に注意を出す
function importLast(){ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']==='import_last'); try{ return r?JSON.parse(r['値'])||{}:{}; }catch(e){ return {}; } }
async function stampImport(kinds){ let v=importLast(); const now=new Date(); const t=`${todayStr()} ${pad(now.getHours())}:${pad(now.getMinutes())}`; kinds.forEach(k=>v[k]=t); try{ const r=await api('stampImport',{kinds}); if(r){ try{ v=JSON.parse(r)||v; }catch(e){} } }catch(e){} D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===''&&p['キー']==='import_last')); D.profiles.push({'利用者ID':'','キー':'import_last','値':JSON.stringify(v)}); renderImportWarn(); } // サーバー側で合流させる（他の種類の印を古い値で上書きしない）
function renderImportWarn(){ const el=$('#impWarn'); if(!el) return; const v=importLast(); const need=[['介護記録','介護記録（毎日の記録・業務日誌）'],['ポータル','ポータルのトーク']]; // 職員の連絡はLINEからポータルのトークに変わった（LINEは新城さんなど一部だけ）2026/11/25
  // 最後に取り込んだ日時を出す。前日より前（＝昨日も今日も取り込んでいない）のものだけ赤で警告
  const y=new Date(); y.setDate(y.getDate()-1); const yStr=`${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}`;
  const fmt=t=>{ if(!t) return '未取込'; const m=String(t).match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/); if(!m) return esc(t); const d=`${m[1]}-${m[2]}-${m[3]}`; return (d===todayStr()?'今日':d===yStr?'昨日':`${+m[2]}/${+m[3]}`)+(m[4]?' '+m[4]:''); };
  const old=need.filter(([k])=>!v[k]||String(v[k]).slice(0,10)<yStr);
  const line=need.map(([k,l])=>`${l}：${fmt(v[k])}`).join('　');
  if(!old.length){ el.className='card'; el.style.cssText='padding:6px 12px;background:#eefaf0;border-color:#b7e1c1;font-size:12.5px'; el.innerHTML=`最終取り込み　${line}`; return; }
  el.className='card'; el.style.cssText='padding:8px 12px;background:#fff3f3;border-color:#f3b4b4;color:#b3261e;font-weight:700'; el.innerHTML=`⚠ 2日以上取り込まれていません：${old.map(([k,l])=>l).join('、')}<div class="muted" style="font-weight:400;color:#7a1f1a;font-size:12px">最終取り込み　${line}<br>${old.some(([k])=>k==='LINE')?'LINEトークはパソコンの「設定」タブから取り込んでください。':''}${old.some(([k])=>k==='介護記録')?'介護記録は毎日22時にパソコンのChromeが自動で取り込みます（Chromeが起動していないと動きません。すぐ入れたいときは拡張機能の「デイ：業務日誌＋介護記録」）。':''}</div>`; }
function renderToday(){ try{ if(D.day&&D.day.meals) dayCachePut(D.date,D.day); }catch(e){} // 保存・削除のあとも端末の控えを最新に
  renderImportWarn();
  $('#ttl').textContent=`入居者記録 ${dateLabel(D.date)}`;
  if(!D.residents.length){ $('#todayList').innerHTML='<div class="card">入居者が登録されていません。「設定」から登録してください。</div>'; return; }
  renderTodaySch();
  $('#todayList').innerHTML=D.residents.map(r=>{
    const sch=schOf(r.id); const notes=D.day.notes.filter(n=>n['利用者ID']===r.id).length; const nx=extOf(r.id).length;
    return `<div class="res" data-id="${r.id}"><div class="room">${esc(r['部屋'])}</div><div class="nm">${esc(r['氏名'])}<small>${esc(sch.map(s=>fmtSch(s)).join('／'))}${notes?`　様子${notes}件`:''}${nx?`　記録${nx}件`:''}</small><div class="badges">${mcBadge(r.id)}${bowelBadge(r.id)}</div></div><div class="chips">${[['朝食','朝'],['昼食','昼'],['夕食','夕']].map(([m,l])=>chip(mealOf(r.id,m),l)).join('')}</div><button type="button" class="mcbtn" data-mc="${r.id}" title="モーニングコール">☎<span>モーニング<br>コール</span></button></div>`;
  }).join('');
  $$('#todayList .res').forEach(el=>el.onclick=()=>openEntry(el.dataset.id));
  $$('#todayList [data-mc]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openMC(b.dataset.mc); });
}

// ===== 入力 =====
function openEntry(rid){ staffExpire(); D.cur=D.residents.find(r=>r.id===rid)||D.allResidents.find(r=>r.id===rid); const h=new Date().getHours(); D.meal=h<10?'朝食':h<15?'昼食':h<17?'おやつ':'夕食'; show('entry'); renderEntry(); window.scrollTo(0,0); }
$('#backBtn').onclick=()=>show('today');
function segButtons(id, vals, onPick){ const el=$('#'+id); el.innerHTML=vals.map(v=>`<button type="button" data-v="${v}">${v}</button>`).join(''); el.onclick=e=>{const b=e.target.closest('button'); if(!b) return; if(el.classList.contains('multi')){ b.classList.toggle('on'); } else { const was=b.classList.contains('on'); [...el.children].forEach(x=>x.classList.toggle('on',x===b&&!was)); } onPick&&onPick(); }; } // 選んでいるボタンをもう一度押すと取り消し
pickButtons('staple',['欠','注文なし']); pickButtons('side',[]); pickButtons('soup',['なし']); /* 食べた量は押すと0〜10が出て選ぶ（2026/11/22） */ segButtons('med',['済','未','薬なし']); segButtons('water',['0','50','100','150','200','300']); $('#sym').classList.add('multi'); segButtons('sym',SYMS);
const segVal=id=>{const b=$('#'+id+' button.on[data-v]');return b?b.dataset.v:'';}; // 数字ピッカーの「選ぶ▼」ボタンも on になるので data-v のあるものだけ見る（2026/11/22 主食が保存できない不具合）
const segSet=(id,v)=>{$$('#'+id+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));};
// ===== 2026/11/22 追加：食べた量の数字ピッカー・記入者が先・モーニングコール・排便 =====
const HOUSE_R={id:'','部屋':'全体','氏名':'アロハハウス全体の業務日誌（見学者の対応・今後の予定など）'};
function pickButtons(id, extras){ const el=$('#'+id); const nums=['0','1','2','3','4','5','6','7','8','9','10'];
  el.classList.add('pick');
  el.innerHTML=`<button type="button" class="pk" data-pk="1">選ぶ ▼</button>${extras.map(v=>`<button type="button" class="ex" data-v="${v}">${v}</button>`).join('')}<div class="pkpanel hide">${nums.map(v=>`<button type="button" data-v="${v}">${v}</button>`).join('')}<div class="pkhint">10＝全部食べた　0＝食べていない</div></div>`;
  el.onclick=e=>{ const b=e.target.closest('button'); if(!b) return; const pn=el.querySelector('.pkpanel');
    if(b.dataset.pk){ $$('.pkpanel').forEach(x=>{ if(x!==pn) x.classList.add('hide'); }); pn.classList.toggle('hide'); return; }
    const was=b.classList.contains('on'); el.querySelectorAll('button[data-v]').forEach(x=>x.classList.toggle('on',x===b&&!was)); pn.classList.add('hide'); pkSync(id); }; }
function pkSync(id){ const el=$('#'+id); if(!el||!el.classList.contains('pick')) return; const b=el.querySelector('.pkpanel button.on'); const pk=el.querySelector('.pk'); pk.textContent=b?`${b.dataset.v}　▼`:'選ぶ ▼'; pk.classList.toggle('on',!!b); }
// 記入者を選ぶまで入力できない。端末に覚えた記入者は30分使わないと消える（共有タブレットで前の人の名前のまま書かないように）
function staffExpire(){ if(Date.now()-(+LS('hc_staff_at')||0)>30*60e3){ LSs('hc_staff',''); if($('#staff')) $('#staff').value=''; } }
function staffLock(){ const ok=!!($('#staff')&&$('#staff').value); $('#p-entry').classList.toggle('nostaff',!ok); }
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='staff'){ LSs('hc_staff',e.target.value); LSs('hc_staff_at',String(Date.now())); staffLock(); } });
// ----- モーニングコール（利用者ごと。変化があったときだけ日誌にも残す）-----
const mcOf=rid=>D.day.notes.filter(n=>n['利用者ID']===rid&&n['種別']==='モーニングコール').concat((D.day.ext||[]).filter(e=>e['利用者ID']===rid&&e['種別']==='モーニングコール').map(e=>({'時刻':e['時刻'],'内容':e['内容'],'記入者':(e['記録者']||e['出所']),_imp:e['出所']}))).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'')); // これまでのアロハ花子（ハウス日誌）・LINEのモーニングコールも入れる
function mcBadge(rid){ const l=mcOf(rid); if(!l.length) return '<span class="bd">☎ 未</span>'; const x=l[l.length-1]; const t=String(x['内容']||''); const ch=/^変化あり/.test(t)||(!x._imp&&t&&t!=='変化なし'); const ok=t==='変化なし'||/^モーニングコール(を)?実施(した)?。?$/.test(t); return `<span class="bd ${ch?'bad':ok?'ok':'warn'}" title="${esc(t)}">☎ ${esc(x['時刻']||'')} ${ch?'変化あり':ok?'変化なし':'記録あり'}</span>`; }
function openMC(rid){ staffExpire(); const r=D.residents.find(x=>x.id===rid); if(!r) return; let ov=$('#mcOv'); if(!ov){ ov=document.createElement('div'); ov.id='mcOv'; ov.className='ov'; document.body.appendChild(ov); }
  const cur=LS('hc_staff')||''; const n=new Date(); const t=`${pad(n.getHours())}:${pad(n.getMinutes())}`;
  ov.innerHTML=`<div class="ovbox"><h2 style="margin:0 0 8px">☎ モーニングコール　${esc(r['部屋'])} ${esc(r['氏名'])}</h2>
   <div class="field"><div class="lb"><span><b>① 記入者</b>（先に選んでください）</span></div><select id="mcStaff"><option value="">（選択）</option>${D.staff.map(s=>`<option ${s===cur?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
   <div id="mcBody"><div class="field"><div class="lb"><span><b>② 様子</b></span><input type="time" id="mcTime" value="${t}" style="width:110px"></div><div class="seg" id="mcSt"><button type="button" data-v="変化なし">変化なし</button><button type="button" data-v="変化あり">変化あり</button></div></div>
   <textarea id="mcText" class="hide" placeholder="どんな変化か（例：声がかすれている、起きられない、体調不良の訴え）"></textarea>
   <div class="row" style="margin-top:10px"><button class="btn" id="mcCancel">やめる</button><button class="btn pri big" id="mcSave">保存</button></div><div id="mcMsg" style="color:#c0392b;font-weight:700;min-height:1.2em"></div></div>
   ${mcOf(rid).length?`<div class="muted" style="margin-top:6px">今日の記録：${mcOf(rid).map(x=>`${esc(x['時刻'])} ${esc(x['内容'])}（${esc(x['記入者'])}）`).join('／')}</div>`:''}</div>`;
  ov.classList.remove('hide');
  const lock=()=>{ $('#mcBody').classList.toggle('locked',!$('#mcStaff').value); }; lock();
  $('#mcStaff').onchange=()=>{ LSs('hc_staff',$('#mcStaff').value); LSs('hc_staff_at',String(Date.now())); if($('#staff')) $('#staff').value=$('#mcStaff').value; lock(); };
  $('#mcSt').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; $$('#mcSt button').forEach(x=>x.classList.toggle('on',x===b)); $('#mcText').classList.toggle('hide',b.dataset.v!=='変化あり'); if(b.dataset.v==='変化あり') $('#mcText').focus(); };
  $('#mcCancel').onclick=()=>ov.classList.add('hide');
  $('#mcSave').onclick=async()=>{ const staff=$('#mcStaff').value; if(!staff) return $('#mcMsg').textContent='記入者を選んでください'; const st=($('#mcSt button.on')||{}).dataset; if(!st) return $('#mcMsg').textContent='「変化なし」か「変化あり」を押してください';
    const ch=st.v==='変化あり'; const txt=$('#mcText').value.trim(); if(ch&&!txt) return $('#mcMsg').textContent='どんな変化かを書いてください';
    const rec={'日付':D.date,'時刻':$('#mcTime').value||t,'利用者ID':r.id,'氏名':r['氏名'],'種別':'モーニングコール','内容':ch?'変化あり：'+txt:'変化なし','記入者':staff};
    const b=$('#mcSave'); b.disabled=true; b.textContent='保存中…';
    try{ const saved=await api('saveNote',{record:rec}); D.day.notes.push(saved); LSs('hc_staff_at',String(Date.now()));
      if(ch) api('saveDiary',{record:{id:'n-'+saved.id,'日付':rec['日付'],'時刻':rec['時刻'],'利用者ID':r.id,'氏名':r['氏名'],'種別':'様子','内容':'モーニングコール：'+txt,'記入者':staff,'出所':'様子記録'}}).catch(()=>{});
      ov.classList.add('hide'); renderToday(); toast(`${r['氏名']} モーニングコールを記録しました`); }
    catch(e){ $('#mcMsg').textContent='保存できませんでした: '+e.message; } finally{ b.disabled=false; b.textContent='保存'; } }; }
// ----- ポータル連携（確認事項）2026/11/22 -----
const PORTAL_API='https://script.google.com/macros/s/AKfycbzqLpjhu6GyK_JWsHLI6E_8xlMF8bQLFUbxm3FXe0pvwFozTq2wteiPWkh7vMGPyZNO/exec';
const lwT=ms=>{ const d=new Date(ms); return `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function portalKey(){ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']==='portal_key'); let v=''; try{ v=r?JSON.parse(r['値']):''; }catch(e){ v=r?r['値']:''; } return LS('hc_portal_k')||v||''; }
async function portalKeySync(){ const k=LS('hc_portal_k'); const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']==='portal_key'); if(k&&!r){ try{ await api('saveProfile',{residentId:'',key:'portal_key',value:k}); D.profiles.push({'利用者ID':'','キー':'portal_key','値':JSON.stringify(k)}); }catch(e){} } } // ポータルから開いた端末の合言葉を、共有タブレットでも使えるように保存
async function portalApi(action,params){ if(RO()&&!/^(kakuninByDate|houseUsers)$/.test(action)) throw new Error('閲覧のみです'); const key=portalKey(); if(!key) throw new Error('ポータルの合言葉がありません（一度ポータルからこのアプリを開いてください）');
  const r=await fetch(PORTAL_API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(Object.assign({action,key},params||{}))}); const j=JSON.parse(await r.text()); if(!j.ok) throw new Error(j.error||'エラー'); return j.data; }
// 「知らせる」：日誌を書いたあと、ポータルのやることに「確認事項があります」を出す（今すぐ／予約）
async function openKK(rid){ staffExpire(); const r=rid?D.residents.find(x=>x.id===rid):HOUSE_R; if(!r) return; let ov=$('#kkOv'); if(!ov){ ov=document.createElement('div'); ov.id='kkOv'; ov.className='ov'; document.body.appendChild(ov); }
  let last=''; try{ const l=(await api('diaryList',{date:D.date})).filter(e=>e['利用者ID']===r.id).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'')); last=l.length?l[l.length-1]['内容']:''; }catch(e){}
  const nm=r.id?r['氏名']+' 様':'ハウス全体'; const cur=LS('hc_staff')||''; const n=new Date(); n.setMinutes(n.getMinutes()+60); const dt=`${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}T${pad(n.getHours())}:00`;
  ov.innerHTML=`<div class="ovbox"><h2 style="margin:0 0 8px">📣 職員に知らせる（${esc(nm)}）</h2>
   <div class="field"><div class="lb"><span><b>① 記入者</b></span></div><select id="kkStaff"><option value="">（選択）</option>${D.staff.map(s=>`<option ${s===cur?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
   <div id="kkBody"><div class="field"><div class="lb"><span><b>② 知らせる先</b></span></div><div class="seg" id="kkGroup"><button type="button" data-v="ハウス全体" class="on">ハウス全体</button><button type="button" data-v="ハウス介護">ハウス介護</button><button type="button" data-v="ハウス調理">ハウス調理</button><button type="button" data-v="デイ">デイ</button></div></div>
   <div class="field"><div class="lb"><span><b>③ 知らせる内容</b>（ポータルのやることに出ます）</span></div><textarea id="kkText" style="min-height:90px">${esc(last)}</textarea></div>
   <div class="field"><div class="lb"><span><b>④ いつ</b></span></div><div class="seg" id="kkWhen"><button type="button" data-v="now" class="on">今すぐ送る</button><button type="button" data-v="later">予約して送る</button></div><input type="datetime-local" id="kkAt" value="${dt}" class="hide" style="margin-top:6px"></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="kkCancel">やめる</button><button class="btn pri big" id="kkSend">知らせる</button></div><div id="kkMsg" style="color:#c0392b;font-weight:700;min-height:1.2em"></div></div></div>`;
  ov.classList.remove('hide'); const lock=()=>$('#kkBody').classList.toggle('locked',!$('#kkStaff').value); lock();
  $('#kkStaff').onchange=()=>{ LSs('hc_staff',$('#kkStaff').value); LSs('hc_staff_at',String(Date.now())); lock(); };
  const one=id=>$('#'+id).onclick=e=>{ const b=e.target.closest('button'); if(!b) return; $$('#'+id+' button').forEach(x=>x.classList.toggle('on',x===b)); if(id==='kkWhen') $('#kkAt').classList.toggle('hide',b.dataset.v!=='later'); }; one('kkGroup'); one('kkWhen');
  $('#kkCancel').onclick=()=>ov.classList.add('hide');
  $('#kkSend').onclick=async()=>{ const staff=$('#kkStaff').value; if(!staff) return $('#kkMsg').textContent='記入者を選んでください'; const text=$('#kkText').value.trim(); if(!text) return $('#kkMsg').textContent='知らせる内容を書いてください';
    const later=$('#kkWhen button.on').dataset.v==='later'; const at=later?new Date($('#kkAt').value).getTime():Date.now(); if(later&&!(at>Date.now())) return $('#kkMsg').textContent='予約は今より後の日時にしてください';
    const b=$('#kkSend'); b.disabled=true; b.textContent='送信中…';
    try{ await portalApi('kakuninAdd',{group:$('#kkGroup button.on').dataset.v,title:`${nm}の日誌に確認事項があります`,text,from:staff,date:D.date,resident:r.id?r['氏名']:'',at}); ov.classList.add('hide'); toast(later?`${lwT(at)} にポータルへ出す予約をしました`:'ポータルのやることに出しました'); }
    catch(e){ $('#kkMsg').textContent='送れませんでした: '+e.message; } finally{ b.disabled=false; b.textContent='知らせる'; } }; }
// 業務ポータル（カイポケ取り込み済み）の利用者情報から、入居者の基本情報の空欄を自動で埋める（入っている値は上書きしない）2026/11/22
async function portalFill(){ try{ if(LS('hc_pfill')===todayStr()) return; const list=await portalApi('houseUsers',{}); if(!Array.isArray(list)) return; LSs('hc_pfill',todayStr());
  const nn=x=>String(x||'').replace(/[\s　]/g,''); const hira=x=>String(x||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)); const items=[];
  for(const r of D.residents){ const u=list.find(x=>nn(x.name)===nn(r['氏名'])); if(!u) continue;
    const pr=(D.profiles||[]).find(p=>p['利用者ID']===r.id&&p['キー']==='basic'); let b={}; try{ b=pr?JSON.parse(pr['値'])||{}:{}; }catch(e){ b={}; } let ch=false;
    const set=(k,v)=>{ if(v&&!b[k]){ b[k]=v; ch=true; } }; set('sex',u.sex); set('birth',u.birth); set('careLevel',u.kaigodo); set('certTo',u.ninteiEnd); set('insurer',u.hokensha); set('kyotaku',u.kyotaku);
    if(ch) items.push({residentId:r.id,key:'basic',value:b});
    if(!r['ふりがな']&&u.kana){ try{ const upd=await api('updateResident',{id:r.id,'ふりがな':hira(u.kana),'入居日':r['入居日']||'','食事形態':r['食事形態']||'','メモ':r['メモ']||''}); r['ふりがな']=(upd&&upd['ふりがな'])||hira(u.kana); }catch(e){} } }
  if(items.length){ await api('saveProfile',{items}); for(const it of items){ D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===it.residentId&&p['キー']==='basic')); D.profiles.push({'利用者ID':it.residentId,'キー':'basic','値':JSON.stringify(it.value)}); } }
}catch(e){} }
// ===== オンコール報告（当番が入力 → 個人日誌・業務日誌に保存 → ポータルからハウス全員に知らせる）2026/11/22 =====
// アロハ花子（カイポケのハウス日誌）をやめたので、オンコールの記録はここで入れる。給与計算用のCSVもここから出す。
const ymdOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDay=(s,n)=>{ const d=new Date(s+'T00:00:00'); d.setDate(d.getDate()+n); return ymdOf(d); };
const wdJ=s=>'日月火水木金土'[new Date(s+'T00:00:00').getDay()];
const mdJ=s=>`${Number(s.slice(5,7))}/${Number(s.slice(8,10))}（${wdJ(s)}）`;
const CIRC='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
// 呼び出しの日付：12時以降は当番日、12時より前は当番日の翌日（夜中〜朝の呼び出し）
const ocCallDate=(duty,t)=>(t&&t>='12:00')?duty:addDay(duty,1);
function ocText(duty,staff,rows){ const nm=id=>{ const r=D.allResidents.find(x=>x.id===id); return r?r['氏名'].replace(/[\s　]+/g,'')+'様':'（入居者以外）'; };
  return `【オンコール報告】${mdJ(duty)} 夜の当番：${staff||'（未選択）'}\n`+(rows.length?`オンコール${rows.length}件\n`+rows.map((r,i)=>`${CIRC[i]||'・'}${r.t?r.t+' ':''}${nm(r.rid)}：${r.text}`).join('\n'):'オンコールなし'); }
// アロハハウス全体グループ（ポータルのトーク）に送る短い文。0件のときは送らない 2026/11/25
function ocShort(duty,staff,rows){ if(!rows.length) return ''; const nm=id=>{ const r=D.allResidents.find(x=>x.id===id); return r?r['氏名'].replace(/[\s　]+/g,'')+'様':'入居者以外'; }; const ns=[...new Set(rows.map(r=>nm(r.rid)))];
  return `【オンコール報告】${mdJ(duty)}夜 当番：${staff||'（未選択）'}\nオンコール${rows.length}件　${ns.join('・')}でした。詳細は個人日誌に記載しています。`; }
function openOC(){ staffExpire(); let ov=$('#ocOv'); if(!ov){ ov=document.createElement('div'); ov.id='ocOv'; ov.className='ov'; document.body.appendChild(ov); }
  const now=new Date(); const duty=now.getHours()<12?addDay(ymdOf(now),-1):ymdOf(now); const cur=LS('hc_staff')||'';
  const resOpts='<option value="">（入居者を選ぶ）</option>'+D.residents.map(r=>`<option value="${r.id}">${esc(r['部屋'])} ${esc(r['氏名'])}</option>`).join('');
  ov.innerHTML=`<div class="ovbox"><h2 style="margin:0 0 6px">📞 オンコール報告</h2><div class="muted" style="margin-bottom:6px">当番明けに当番の人が入力します。保存すると個人日誌・業務日誌に入ります。呼び出しがあったときは、ポータルの「アロハハウス」グループにメッセージが届きます（0件のときは送りません）。</div>
   <div class="field"><div class="lb"><span><b>① 当番の日</b>（夜の当番に入った日）</span></div><input type="date" id="ocDate" value="${duty}"></div>
   <div class="field"><div class="lb"><span><b>② 当番の人</b></span></div><select id="ocStaff"><option value="">（選択）</option>${D.staff.map(s=>`<option ${s===cur?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
   <div id="ocBody"><div class="field"><div class="lb"><span><b>③ 呼び出し</b></span></div><div class="seg" id="ocHas"><button type="button" data-v="0" class="on">なし（0件）</button><button type="button" data-v="1">あり</button></div></div>
   <div id="ocRows"></div><button class="btn hide" id="ocAdd" type="button" style="margin-top:4px">＋ 呼び出しを足す</button>
   <div class="field" style="margin-top:8px"><div class="lb"><span><b>アロハハウスのグループに送られるメッセージ</b></span></div><pre id="ocPrev" style="white-space:pre-wrap;background:#fff7e6;border-radius:8px;padding:8px;margin:0;font:inherit;font-size:13px"></pre></div>
   <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn" id="ocCancel">やめる</button><button class="btn pri big" id="ocSend">保存して全員に知らせる</button></div><div id="ocMsg" style="color:#c0392b;font-weight:700;min-height:1.2em"></div></div></div>`;
  ov.classList.remove('hide');
  const rowHtml=()=>`<div class="card ocrow" style="padding:8px;margin:6px 0"><div class="row" style="gap:6px;flex-wrap:wrap"><input type="time" data-k="t" style="flex:none;width:110px"><select data-k="rid" style="flex:1 1 160px">${resOpts}</select><button class="btn" type="button" data-k="del" style="flex:none;padding:2px 10px">消す</button></div><textarea data-k="text" placeholder="呼ばれた理由・対応・その後の様子" style="min-height:60px;margin-top:4px"></textarea></div>`;
  const rows=()=>$$('#ocRows .ocrow').map(c=>({t:c.querySelector('[data-k="t"]').value,rid:c.querySelector('[data-k="rid"]').value,text:c.querySelector('[data-k="text"]').value.trim()}));
  const upd=()=>{ const rr=$('#ocHas button.on').dataset.v==='1'?rows():[]; $('#ocPrev').textContent=ocShort($('#ocDate').value,$('#ocStaff').value,rr)||'0件なので送りません（日誌への保存だけ）'; $('#ocSend').textContent=rr.length?'保存してグループに知らせる':'保存する'; $('#ocBody').classList.toggle('locked',!$('#ocStaff').value); };
  const addRow=()=>{ $('#ocRows').insertAdjacentHTML('beforeend',rowHtml()); const c=$$('#ocRows .ocrow').pop(); c.querySelector('[data-k="del"]').onclick=()=>{ c.remove(); upd(); }; c.oninput=upd; c.onchange=upd; upd(); };
  $('#ocHas').onclick=e=>{ const b=e.target.closest('button'); if(!b) return; $$('#ocHas button').forEach(x=>x.classList.toggle('on',x===b)); const has=b.dataset.v==='1'; $('#ocAdd').classList.toggle('hide',!has); $('#ocRows').classList.toggle('hide',!has); if(has&&!$$('#ocRows .ocrow').length) addRow(); upd(); };
  $('#ocAdd').onclick=addRow; $('#ocDate').onchange=upd; $('#ocStaff').onchange=()=>{ LSs('hc_staff',$('#ocStaff').value); LSs('hc_staff_at',String(Date.now())); upd(); };
  $('#ocCancel').onclick=()=>ov.classList.add('hide'); upd();
  $('#ocSend').onclick=async()=>{ const duty=$('#ocDate').value, staff=$('#ocStaff').value; const rs=$('#ocHas button.on').dataset.v==='1'?rows():[]; const M=t=>$('#ocMsg').textContent=t;
    if(!duty) return M('当番の日を入れてください'); if(!staff) return M('当番の人を選んでください');
    for(const [i,r] of rs.entries()){ if(!r.t) return M(`${i+1}件目の時刻を入れてください`); if(!r.rid) return M(`${i+1}件目の入居者を選んでください`); if(!r.text) return M(`${i+1}件目の内容を書いてください`); }
    const b=$('#ocSend'); b.disabled=true; b.textContent='保存中…'; const text=ocText(duty,staff,rs), short=ocShort(duty,staff,rs);
    try{
      for(const r of rs){ const res=D.allResidents.find(x=>x.id===r.rid); const cd=ocCallDate(duty,r.t);
        await api('saveDiary',{record:{id:`oc-${cd.replace(/-/g,'')}${r.t.replace(':','')}-${r.rid}`,'日付':cd,'時刻':r.t,'利用者ID':r.rid,'氏名':res['氏名'],'種別':'オンコール','内容':r.text,'記入者':staff,'出所':'オンコール報告'}}); }
      // 当番1日に1件のまとめ（業務日誌・給与計算のCSVに使う。入れ直したら上書き）
      await api('saveDiary',{record:{id:'ocd-'+duty,'日付':duty,'時刻':'','利用者ID':'','氏名':HOUSE_R['氏名'],'種別':'オンコール当番','内容':`オンコール呼び出し${rs.length}件【担当:${staff}】`+(rs.length?'\n'+text.split('\n').slice(2).join('\n'):''),'記入者':staff,'出所':'オンコール報告'}});
      LSs('hc_staff_at',String(Date.now()));
    }catch(e){ b.disabled=false; b.textContent=rs.length?'保存してグループに知らせる':'保存する'; return M('保存できませんでした: '+e.message); }
    if(!rs.length){ ov.classList.add('hide'); toast('保存しました（0件なのでメッセージは送っていません）'); if($('#p-diary').classList.contains('on')) renderDiary(); return; }
    try{ await portalApi('oncallReport',{date:duty,staff,count:rs.length,text,short}); ov.classList.add('hide'); toast('保存して、アロハハウスのグループに知らせました'); }
    catch(e){ M('日誌には保存しました。ポータルへの送信はできませんでした: '+e.message); b.textContent='もう一度知らせる'; b.disabled=false; b.onclick=async()=>{ try{ await portalApi('oncallReport',{date:duty,staff,count:rs.length,text,short}); ov.classList.add('hide'); toast('アロハハウスのグループに知らせました'); }catch(er){ M('送れませんでした: '+er.message); } }; }
    if($('#p-diary').classList.contains('on')) renderDiary(); };
}
// 給与計算アプリ用：オンコール当番のCSV（当番日・担当・件数・内容）。当番明けの記録の前日が当番日
async function ocCsv(ym){ const [y,m]=ym.split('-').map(Number); const nx=`${m===12?y+1:y}-${pad(m===12?1:m+1)}`;
  const [m1,m2,d1,d2]=await Promise.all([api('month',{ym}),api('month',{ym:nx}),api('diaryList',{ym}),api('diaryList',{ym:nx})]);
  const ext=[...(m1.ext||[]),...(m2.ext||[])], dl=[...d1,...d2]; const nm=Object.fromEntries(D.allResidents.map(r=>[r.id,r['氏名'].replace(/[\s　]+/g,'')]));
  const byDuty={};
  // ① オンコール報告（この画面から入れたもの）が正
  dl.filter(e=>String(e.id||'').startsWith('ocd-')).forEach(e=>{ const mm=String(e['内容']).match(/オンコール呼び出し(\d+)件【担当:([^】]*)】/); byDuty[e['日付']]={duty:e['日付'],staff:mm?mm[2]:e['記入者'],count:mm?Number(mm[1]):0,src:'オンコール報告',calls:[]}; });
  // ② アロハ花子（カイポケのハウス日誌）の「オンコール呼び出し○件【担当:○○】」（当番明けの朝の記録 → 前日が当番日）
  ext.filter(e=>e['利用者ID']===''&&/オンコール呼び出し/.test(e['内容']||'')).forEach(e=>{ const t=String(e['内容']); const am=t.match(/[【[]([^】\]]*担当[^】\]]*)(?:[】\]]|$)/); if(!am) return; const staff=am[1].replace(/担当/g,'').replace(/[:：]/g,'').trim().split(/[\s　。、]/)[0]; if(!staff) return; // 閉じ括弧の無い「【担当: 池田 み。22時」も名前だけ
    const cm=t.match(/オンコール呼び出し\s*([0-9０-９]*)\s*件/); const cnt=Number(String(cm&&cm[1]||'0').replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))); const duty=addDay(e['日付'],-1); if(byDuty[duty]) return; byDuty[duty]={duty,staff,count:cnt,src:'アロハ花子',calls:[]}; });
  // ③ 内容：入居者の個人日誌のオンコール記録（12時以降はその日、12時より前は前日の当番）
  dl.filter(e=>e['種別']==='オンコール'&&e['利用者ID']).forEach(e=>{ const t=e['時刻']||''; const duty=(!t||t>='12:00')?e['日付']:addDay(e['日付'],-1); (byDuty[duty]||(byDuty[duty]={duty,staff:'',count:0,src:'個人日誌のみ',calls:[]})).calls.push(`${t?t+' ':''}${nm[e['利用者ID']]||''}様：${String(e['内容']).replace(/\s+/g,' ')}`); });
  const rows=Object.values(byDuty).filter(x=>x.duty.startsWith(ym)).sort((a,b)=>a.duty.localeCompare(b.duty));
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv='﻿'+['当番日,曜日,担当,呼び出し件数,内容,もと'].concat(rows.map(x=>[x.duty,wdJ(x.duty),x.staff,Math.max(x.count,x.calls.length),x.calls.join(' ／ '),x.src].map(q).join(','))).join('\r\n')+'\r\n';
  return {csv,rows}; }
async function ocCsvDownload(){ const ym=(D.date||ymdOf(new Date())).slice(0,7); busy(true); try{ const {csv,rows}=await ocCsv(ym); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`オンコール当番_${ym}.csv`; document.body.appendChild(a); a.click(); a.remove(); const noStaff=rows.filter(x=>!x.staff).length; toast(`${ym} のオンコール当番 ${rows.length}日分を出しました`+(noStaff?`（担当が空の日 ${noStaff}日）`:'')); }catch(e){ toast('出せませんでした: '+e.message); } finally{ busy(false); } }
// ハウス全体の記録（オンコールなど）を押すと、その日の個人日誌へ
function hxBind(sel){ $$(sel+' .hx-write').forEach(b=>b.onclick=async e=>{ e.stopPropagation(); const x=houseExt().find(v=>String(v.id||'')===b.dataset.hx); if(!x) return; b.disabled=true; let l=[]; try{ l=await hxLinked(x); if(!l.length&&hxIsOC(x)&&!RO()&&await hxPickLine(x)) l=await hxLinked(x); }catch(er){} b.disabled=false; if(l.length===1) return hxJump(l[0]); if(l.length) return hxPick(x,l); openHX(x); }); }
// ハウス全体の記録に対応する個人日誌（この記録から書いたもの＋オンコールは前日昼〜当日のオンコール記録）2026/11/22
async function hxLinked(x){ const d=x['日付']||D.date; const pd=new Date(d+'T00:00:00'); pd.setDate(pd.getDate()-1); const prev=`${pd.getFullYear()}-${pad(pd.getMonth()+1)}-${pad(pd.getDate())}`; const oc=hxIsOC(x);
  const [a,b]=await Promise.all([api('diaryList',{date:d}),oc?api('diaryList',{date:prev}):Promise.resolve([])]);
  const mine=e=>String(e.id||'').startsWith('hxd-'+x.id+'-'); const ocOk=e=>oc&&e['種別']==='オンコール'&&e['利用者ID'];
  return [...b.filter(e=>mine(e)||(ocOk(e)&&(!e['時刻']||e['時刻']>='12:00'))),...a.filter(e=>mine(e)||ocOk(e))].sort((p,q)=>((p['日付']||'')+(p['時刻']||'')).localeCompare((q['日付']||'')+(q['時刻']||''))); }
// 個人日誌にまだないとき：LINEで入居者ごとに来ているオンコールの詳細（前日昼〜当日）を個人日誌に書き写す 2026/11/22
async function hxPickLine(x){ const d=x['日付']||D.date; const pd=new Date(d+'T00:00:00'); pd.setDate(pd.getDate()-1); const prev=`${pd.getFullYear()}-${pad(pd.getMonth()+1)}-${pad(pd.getDate())}`;
  let ext=(D.day&&D.day.ext||[]).slice(); if(d!==D.date){ try{ ext=(await api('day',{date:d})).ext||[]; }catch(e){ ext=[]; } } try{ ext=ext.concat(((await api('day',{date:prev})).ext||[]).filter(e=>!e['時刻']||e['時刻']>='12:00')); }catch(e){}
  const seen=new Set(); const src=ext.filter(e=>e['利用者ID']&&e['種別']==='オンコール'&&/LINE/.test(e['出所']||'')&&e['内容']).filter(e=>{ const k=e['利用者ID']+'|'+e['内容']; if(seen.has(k)) return false; seen.add(k); return true; });
  const tanto=(String(x['内容']).match(/担当[:：\s]*([^\s】]+)/)||[])[1]||''; const staff=D.staff.find(v=>tanto&&v.startsWith(tanto))||tanto||'LINE'; let k=0;
  for(const e of src){ const r=D.allResidents.find(v=>v.id===e['利用者ID']); if(!r) continue; try{ await api('saveDiary',{record:{id:'lx-'+e.id,'日付':e['日付']||d,'時刻':e['時刻']||'','利用者ID':r.id,'氏名':r['氏名'],'種別':'オンコール','内容':String(e['内容'])+(e['時刻']?'':'（時刻はLINEに記載なし）'),'記入者':staff,'出所':'LINE'}}); k++; }catch(er){} }
  if(k) toast(`LINEのオンコールの詳細を${k}件、個人日誌に書き写しました`); return k; }
// 個人日誌のその記録へ飛ぶ
function hxJump(e){ const ov=$('#hxOv'); if(ov) ov.classList.add('hide'); D.diaryFocus=e.id; if(e['日付']&&e['日付']!==D.date){ D.date=e['日付']; $('#date').value=D.date; loadDay(); } $('#dMode').value='day'; show('diary'); }
// 対応の記録が2件以上あるとき：選んで飛ぶ
function hxPick(x,l){ let ov=$('#hxOv'); if(!ov){ ov=document.createElement('div'); ov.id='hxOv'; ov.className='ov'; document.body.appendChild(ov); } const nm=Object.fromEntries(D.residents.map(r=>[r.id,r['氏名']]));
  ov.innerHTML=`<div class="ovbox"><h2 style="margin:0 0 6px">📝 詳細（個人日誌）</h2><div class="ext" style="margin-bottom:8px"><span class="m">${esc(x['時刻']||'')} ${esc(x['種別']||'')} ${esc(x['記録者']||'')}</span><br>${esc(x['内容']||'')}</div>${l.map((e,i)=>`<div class="n" style="display:flex;gap:8px;align-items:center"><div style="flex:1;min-width:0"><div class="m">${esc(dateLabel(e['日付']||D.date))} ${esc(e['時刻']||'')} ${esc(nm[e['利用者ID']]||e['氏名']||'')}　${esc(e['記入者']||'')}</div>${esc(e['内容'])}</div><button class="btn pri" data-hj="${i}" style="flex:none;padding:6px 10px">個人日誌へ</button></div>`).join('')}<div class="row" style="margin-top:10px"><button class="btn" id="hxClose">閉じる</button></div></div>`;
  ov.classList.remove('hide'); $('#hxClose').onclick=()=>ov.classList.add('hide'); $$('#hxOv [data-hj]').forEach(b=>b.onclick=()=>hxJump(l[+b.dataset.hj])); }
// オンコールなどハウス全体の記録の「詳細を書く」：対応した入居者を選んで、その人の個人日誌に書く（書いたら知らせることもできる）2026/11/22
async function openHX(x){ staffExpire(); let ov=$('#hxOv'); if(!ov){ ov=document.createElement('div'); ov.id='hxOv'; ov.className='ov'; document.body.appendChild(ov); }
  const cur=LS('hc_staff')||''; const oc=x&&/オンコール/.test((x['種別']||'')+(x['内容']||'')); const n=new Date(); const t=`${pad(n.getHours())}:${pad(n.getMinutes())}`;
    ov.innerHTML=`<div class="ovbox"><h2 style="margin:0 0 6px">📝 ${oc?'オンコール対応の詳細':'詳細'}</h2>${x?`<div class="ext" style="margin-bottom:8px"><span class="m">${esc(x['時刻']||'')} ${esc(x['種別']||'')} ${esc(x['記録者']||'')}</span><br>${esc(x['内容']||'')}</div>`:''}
   ${hxBare(x)?'<div style="margin-bottom:8px;padding:10px;background:#fff7e6;border-radius:8px;font-weight:700;color:#c0392b">詳細は記載していません</div>':''}${!hxBare(x)&&!RO()?'<button class="btn" id="hxMore" style="margin-bottom:8px">入居者の個人日誌にも書く</button>':''}
   <div id="hxForm"${RO()||!hxBare(x)?' class="hide"':''}><b style="font-size:13px">詳細を書く（対応した入居者の個人日誌に入ります）</b>
   <div class="field"><div class="lb"><span><b>① 記入者</b></span></div><select id="hxStaff"><option value="">（選択）</option>${D.staff.map(s=>`<option ${s===cur?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
   <div id="hxBody"><div class="field"><div class="lb"><span><b>② 対応した入居者</b></span><input type="time" id="hxTime" value="${esc((x&&x['時刻'])||t)}" style="width:110px"></div><select id="hxRes"><option value="">（選択）</option>${D.residents.map(r=>`<option value="${r.id}">${esc(r['部屋'])} ${esc(r['氏名'])}</option>`).join('')}</select></div>
   <div class="field"><div class="lb"><span><b>③ 内容</b>（呼ばれた理由・対応・その後の様子）</span></div><textarea id="hxText" style="min-height:110px" placeholder="例：0:20 トイレに行こうとしてベッドからずり落ち、ナースコールあり。0:40訪問し2人介助でベッドへ。外傷なし。朝まで様子観察。">${oc?'オンコール対応：':''}</textarea></div>
   <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn" id="hxCancel">やめる</button><button class="btn pri" id="hxSave">個人日誌に保存</button><button class="btn pri" id="hxSaveKK">保存して職員に知らせる</button></div><div id="hxMsg" style="color:#c0392b;font-weight:700;min-height:1.2em"></div></div></div>${RO()?'<div class="row" style="margin-top:8px"><button class="btn" onclick="this.closest(\'.ov\').classList.add(\'hide\')">閉じる</button></div>':''}</div>`;
  ov.classList.remove('hide'); const lock=()=>$('#hxBody').classList.toggle('locked',!$('#hxStaff').value); lock();
  $('#hxStaff').onchange=()=>{ LSs('hc_staff',$('#hxStaff').value); LSs('hc_staff_at',String(Date.now())); if($('#staff')) $('#staff').value=$('#hxStaff').value; lock(); };
  $('#hxCancel').onclick=()=>ov.classList.add('hide'); if($('#hxMore')) $('#hxMore').onclick=()=>{ $('#hxMore').remove(); $('#hxForm').classList.remove('hide'); };
  if(!hxBare(x)&&!RO()) $('#hxForm').insertAdjacentHTML('afterend','<div class="row" id="hxCl" style="margin-top:8px"><button class="btn" onclick="this.closest(\'.ov\').classList.add(\'hide\')">閉じる</button></div>');
  const save=async kk=>{ const staff=$('#hxStaff').value, rid=$('#hxRes').value, text=$('#hxText').value.trim(); if(!staff) return $('#hxMsg').textContent='記入者を選んでください'; if(!rid) return $('#hxMsg').textContent='対応した入居者を選んでください'; if(!text||text==='オンコール対応：') return $('#hxMsg').textContent='内容を書いてください';
    const r=D.residents.find(v=>v.id===rid); try{ await api('saveDiary',{record:{id:'hxd-'+(x&&x.id||'')+'-'+Date.now().toString(36),'日付':D.date,'時刻':$('#hxTime').value||t,'利用者ID':rid,'氏名':r['氏名'],'種別':oc?'オンコール':'様子','内容':text,'記入者':staff,'出所':'手入力'}}); LSs('hc_staff_at',String(Date.now())); ov.classList.add('hide'); toast(`${r['氏名']}さんの個人日誌に保存しました`); if(kk) openKK(rid); }
    catch(e){ $('#hxMsg').textContent='保存できませんでした: '+e.message; } };
  $('#hxSave').onclick=()=>save(false); $('#hxSaveKK').onclick=()=>save(true); }
// ----- アロハ花子（ハウス日誌）の過去の記録で、入居者が決まっていないものを振り分ける（途中で切れた文は同じ記録ごとにつなげて表示）-----
async function renderSort(out){ out.innerHTML='<div class="muted">読み込み中…</div>'; const all=[]; const n=new Date(); for(let i=3;i>=0;i--){ const d=new Date(n.getFullYear(),n.getMonth()-i,1); const ym=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; try{ const m=await api('month',{ym}); all.push(...(m.ext||[]).filter(e=>e['出所']==='ハウス日誌')); }catch(e){} }
  const keep=new Set((()=>{ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']==='hx_keep'); try{ return r?JSON.parse(r['値'])||[]:[]; }catch(e){ return []; } })());
  const R=D.residents; const sur=r=>String(r['氏名']).split(/[\s　]/)[0]; const given=r=>String(r['氏名']).split(/[\s　]/)[1]||''; const ALT={'安藝':['安芸','あき'],'大嶋':['大島'],'新城':['新庄'],'合志':['ゴウシ','内海']}; /* 内海様＝合志さんの娘さん */ const keys=r=>[sur(r),...(ALT[sur(r)]||[]),given(r)].filter(x=>x&&x.length>=2); // 名字・下の名前・よくある書き間違い
  // 同じ日・時刻・記録者の切れた文を1つにまとめる
  const groups=[]; const gm={}; all.filter(e=>!e['利用者ID']&&e['種別']!=='オンコール'&&!keep.has(e.id)).forEach(e=>{ const k=e['日付']+'|'+(e['時刻']||'')+'|'+(e['記録者']||''); if(!gm[k]){ gm[k]={k,e,ids:[],texts:[]}; groups.push(gm[k]); } gm[k].ids.push(e.id); gm[k].texts.push(String(e['内容']||'')); });
  groups.forEach(g=>{ g.text=g.texts.join(''); const sib=all.filter(x=>x['日付']+'|'+(x['時刻']||'')+'|'+(x['記録者']||'')===g.k); g.ctx=sib.map(x=>x['利用者ID']?esc(x['内容']||''):`<b style="background:#fff3c4">${esc(x['内容']||'')}</b>`).join(''); g.hasCtx=sib.some(x=>x['利用者ID']); }); // 同じ記録のうち入居者が決まっている部分も前後の文として見せる
  groups.sort((a,b)=>(a.e['日付']+(a.e['時刻']||'')).localeCompare(b.e['日付']+(b.e['時刻']||'')));
  const guess=g=>{ const t=g.text; const h=R.filter(r=>keys(r).some(s=>t.includes(s))); if(h.length===1) return {v:h[0].id};
    const ids=[...new Set(all.filter(x=>x['利用者ID']&&x['日付']===g.e['日付']&&x['時刻']===g.e['時刻']&&(x['記録者']||'')===(g.e['記録者']||'')).map(x=>x['利用者ID']))]; if(ids.length===1) return {v:ids[0]};
    const m=t.match(/(?:^|[^一-龥])([一-龥]{2,3})(様|さん)/); if(m&&!/娘|息子|奥|旦那|家族|本人|職員|看護|先生|本日|全介助|予定|歯科|病院|薬局|業者/.test(m[1])) return {v:'day',name:m[1]}; return {v:''}; };
  if(!groups.length){ out.innerHTML='<div class="card">振り分けが必要な記録はありません。</div>'; return; }
  const opts=g=>{ const x=guess(g); return `<option value="">（選んでください）</option>${R.map(r=>`<option value="${r.id}" ${r.id===x.v?'selected':''}>${esc(r['部屋'])} ${esc(r['氏名'])}（入居者の個人日誌へ）</option>`).join('')}<option value="day" ${x.v==='day'?'selected':''}>デイの利用者（ハウス外）の記録へ</option><option value="keep">ハウス全体の記録として残す</option>`; };
  out.innerHTML=`<div class="card"><h2 style="margin:0 0 6px">アロハ花子（ハウス日誌）の記録の振り分け</h2><div class="muted">入居者が決まっていない記録 ${groups.length}件です（途中で切れていた文は、同じ記録ごとにつなげました）。行き先を選んで「移す」を押してください。<br>・入居者 → その人の個人日誌へ　・デイの利用者（小野様・関根様など、ハウスに住んでいない方）→「デイ利用者の記録」へ（名前を入れる）　・どれでもない → ハウス全体の記録として残す<br>最初から選ばれているのは自動で見つけた候補です。</div><button class="btn pri" id="srtAll" style="margin-top:8px">行き先を選んだものをまとめて移す</button></div>`+
    groups.map((g,i)=>{ const x=guess(g); return `<div class="card" data-srt="${i}" style="padding:8px 12px"><div class="muted">${esc(g.e['日付'])} ${esc(g.e['時刻']||'')} ${esc(g.e['記録者']||'')}${g.ids.length>1?`（${g.ids.length}つに切れていた文をつなげました）`:''}</div><div style="margin:4px 0">${g.hasCtx?`<span class="muted" style="font-size:12px">元の記録全体（黄色が振り分けが必要な部分）：</span><br>${g.ctx}`:esc(g.text)}</div><div class="row" style="flex-wrap:wrap"><select data-k="r" style="flex:1 1 240px">${opts(g)}</select><input data-k="nm" placeholder="デイ利用者の名前（例：小野）" value="${esc(x.name||'')}" class="${x.v==='day'?'':'hide'}" style="flex:1 1 160px"><button class="btn" data-go style="flex:none">移す</button></div></div>`; }).join('');
  $$('#diaryOut [data-srt] [data-k="r"]').forEach(sel=>sel.onchange=()=>sel.parentNode.querySelector('[data-k="nm"]').classList.toggle('hide',sel.value!=='day'));
  const move=async card=>{ const g=groups[+card.dataset.srt]; const v=card.querySelector('[data-k="r"]').value; if(!g||!v) return false;
    if(v==='keep'){ const k=[...keep,...g.ids]; await api('saveProfile',{residentId:'',key:'hx_keep',value:k}); g.ids.forEach(id=>keep.add(id)); D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===''&&p['キー']==='hx_keep')); D.profiles.push({'利用者ID':'','キー':'hx_keep','値':JSON.stringify(k)}); card.remove(); return true; }
    let rid,name; if(v==='day'){ name=card.querySelector('[data-k="nm"]').value.trim(); if(!name){ toast('デイ利用者の名前を入れてください'); return false; } rid='day:'+name; } else { const r=R.find(x=>x.id===v); rid=r.id; name=r['氏名']; }
    await api('saveDiary',{record:{id:'hx-'+g.ids[0],'日付':g.e['日付'],'時刻':g.e['時刻']||'','利用者ID':rid,'氏名':name,'種別':v==='day'?'デイ利用者':'様子','内容':g.text,'記入者':g.e['記録者']||'','出所':'ハウス日誌'}});
    for(const id of g.ids) await api('deleteExt',{id}); card.remove(); return true; };
  $$('#diaryOut [data-go]').forEach(b=>b.onclick=async()=>{ const c=b.closest('[data-srt]'); if(!c.querySelector('[data-k="r"]').value) return toast('行き先を選んでください'); b.disabled=true; try{ if(await move(c)) toast('移しました'); else b.disabled=false; }catch(e){ toast('失敗: '+e.message); b.disabled=false; } });
  $('#srtAll').onclick=async()=>{ const cs=$$('#diaryOut [data-srt]').filter(c=>c.querySelector('[data-k="r"]').value); if(!cs.length) return toast('行き先を選んだものがありません'); if(!confirm(`${cs.length}件を移しますか？`)) return; let k=0; busy(true); for(const c of cs){ try{ if(await move(c)) k++; }catch(e){} } busy(false); toast(`${k}件を移しました`); loadDay(); };
}
// ----- デイサービスの個別活動（カイポケ介護記録の「ケース」などから読み取る）2026/11/22 -----
function dayActs(rid){ const ex=(D.day.ext||[]).filter(e=>e['利用者ID']===rid&&e['出所']==='介護記録'); if(!ex.length) return null;
  const clean=t=>String(t||'').replace(/\s+/g,'').replace(/、/g,'、'); const o={};
  const used=ex.some(e=>/利用[:：]○/.test(e['内容']||'')||e['種別']==='利用'); if(!used) return null;
  const k=ex.find(e=>e['種別']==='ケース'); if(k){ const t=clean(k['内容']).replace(/^その他の活動[:：]/,''); o.act=t; }
  const kn=ex.filter(e=>e['種別']==='機能訓練').map(e=>{ const t=String(e['内容']||''); const cat=(t.match(/カテゴリ[:：]\s*([^、【]+)/)||[])[1]||''; const nai=(t.match(/訓練内容[:：]\s*([^、【]+)/)||[])[1]||''; const sp=(t.match(/【特記】([\s\S]*)/)||[])[1]||''; return [cat.trim(),nai.trim()].filter(Boolean).join('・')+(sp?`（${clean(sp)}）`:''); }).filter(Boolean); if(kn.length) o.kunren=kn.join('／');
  const rk=ex.filter(e=>e['種別']==='レク').map(e=>(String(e['内容']||'').match(/レク内容[:：]\s*([^\n【]+)/)||[])[1]).filter(Boolean).map(clean); if(rk.length) o.rec=[...new Set(rk)].join('／');
  const ny=ex.find(e=>e['種別']==='入浴'); if(ny){ const m=String(ny['内容']).match(/入浴方法[:：]\s*([^、\s]+)/); o.bath=/入浴[:：]○/.test(ny['内容'])?('○'+(m?'（'+m[1]+'）':'')):'×'; }
  const sp=ex.filter(e=>['特記','処置'].includes(e['種別'])||/【特記】/.test(e['内容']||'')).filter(e=>e['種別']!=='機能訓練').map(e=>clean((String(e['内容']).match(/【特記】([\s\S]*)/)||[,e['種別']==='特記'?e['内容']:''])[1])).filter(Boolean); if(sp.length) o.toku=sp.join('／');
  return o; }
function dayActsHtml(rid){ const o=dayActs(rid); if(!o) return ''; const row=(l,v)=>v?`<div class="gn"><span class="gm">${l}</span> ${esc(v)}</div>`:'';
  return `<div class="gn" style="background:#eef6ff"><span class="gm" style="color:#1d5fa8">デイサービス</span>${o.bath?' 入浴'+esc(o.bath):''}</div>`+row('個別活動',o.act)+row('機能訓練',o.kunren)+row('レク',o.rec)+row('デイの特記',o.toku); }
// ----- 排便（あり／なし。なしは何日目かを出す）-----
const BOWEL={}; // ym -> {t, notes}
const isAri=n=>n['種別']==='排便'&&/^あり/.test(n['内容']||'');
async function loadBowel(){ const d=new Date(D.date+'T00:00:00'); const yms=[D.date.slice(0,7)]; d.setDate(0); yms.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`);
  let ch=false; for(const ym of yms){ const c=BOWEL[ym]; if(c&&(Date.now()-c.t<5*60e3||ym<todayStr().slice(0,7))) continue; try{ const m=await api('month',{ym}); BOWEL[ym]={t:Date.now(),notes:(m.notes||[]).filter(n=>n['種別']==='排便')}; ch=true; }catch(e){} }
  if(ch){ renderToday(); if($('#p-entry').classList.contains('on')) renderBowel(); } }
function lastAri(rid){ let last=''; const all=Object.values(BOWEL).flatMap(c=>c.notes).concat(D.day.notes); all.forEach(n=>{ if(n['利用者ID']===rid&&isAri(n)&&n['日付']<=D.date&&n['日付']>last) last=n['日付']; }); return last; }
function bowelBadge(rid){ const today=D.day.notes.filter(n=>n['利用者ID']===rid&&n['種別']==='排便'); const ari=today.filter(isAri);
  if(ari.length){ const st=ari.map(n=>(n['内容'].match(/（(.*)）/)||[])[1]).filter(Boolean).join('・'); return `<span class="bd ok">便あり${st?'（'+esc(st)+'）':''}</span>`; }
  const last=lastAri(rid); if(!last) return `<span class="bd">${today.length?'便なし':'便 記録なし'}</span>`;
  const n=Math.round((new Date(D.date+'T00:00:00')-new Date(last+'T00:00:00'))/864e5); return `<span class="bd ${n>=3?'bad':'warn'}">排便なし${n}日目</span>`; }
const BOWEL_ST=['普通便','軟便','硬便','水様便','少量','多量','血便'];
function renderBowel(){ const r=D.cur; if(!r||!$('#bowelList')) return; const l=D.day.notes.filter(n=>n['利用者ID']===r.id&&n['種別']==='排便').sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''));
  $('#bowelNow').innerHTML=bowelBadge(r.id); $('#bowelList').innerHTML=l.map(n=>`<div class="n"><div class="m">${esc(n['時刻']||'')} 排便　${esc(n['記入者'])} <button class="btn danger" data-bdel="${n.id}" style="padding:1px 8px;font-size:11px;float:right">削除</button></div>${esc(n['内容'])}</div>`).join('');
  $$('#bowelList [data-bdel]').forEach(b=>b.onclick=async()=>{ if(!confirm('削除しますか？')) return; try{ await api('saveNote',{record:{id:b.dataset.bdel,_delete:true}}); api('saveDiary',{record:{id:'n-'+b.dataset.bdel,_delete:true}}).catch(()=>{}); D.day.notes=D.day.notes.filter(x=>x.id!==b.dataset.bdel); renderBowel(); renderToday(); }catch(e){ toast('失敗: '+e.message); } }); }
segButtons('bowel',['なし','あり'],()=>{ $('#bowelStWrap').classList.toggle('hide',segVal('bowel')!=='あり'); }); $('#bowelSt').classList.add('multi'); segButtons('bowelSt',BOWEL_ST);
$('#saveBowel').onclick=async()=>{ const r=D.cur; const v=segVal('bowel'); if(!v) return toast('「なし」か「あり」を押してください'); const staff=$('#staff').value; if(!staff) return toast('記入者を選んでください');
  const st=$$('#bowelSt button.on').map(b=>b.dataset.v); if(v==='あり'&&!st.length) return toast('便の状態を選んでください');
  const n=new Date(); const rec={'日付':D.date,'時刻':$('#bowelTime').value||`${pad(n.getHours())}:${pad(n.getMinutes())}`,'利用者ID':r.id,'氏名':r['氏名'],'種別':'排便','内容':v==='あり'?`あり（${st.join('・')}）`:'なし','記入者':staff};
  const b=$('#saveBowel'); b.disabled=true; try{ const saved=await api('saveNote',{record:rec}); D.day.notes.push(saved); LSs('hc_staff_at',String(Date.now()));
    if(v==='あり') api('saveDiary',{record:{id:'n-'+saved.id,'日付':rec['日付'],'時刻':rec['時刻'],'利用者ID':r.id,'氏名':r['氏名'],'種別':'排泄','内容':'排便'+rec['内容'],'記入者':staff,'出所':'様子記録'}}).catch(()=>{});
    segSet('bowel',''); $$('#bowelSt button').forEach(x=>x.classList.remove('on')); $('#bowelStWrap').classList.add('hide'); $('#bowelTime').value=''; renderBowel(); renderToday(); toast('排便を記録しました'); }
  catch(e){ toast('失敗: '+e.message); } finally{ b.disabled=false; } };
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
  $('#memo').value=m['備考']||''; $('#staffPrev').textContent=m['記入者']?`（この食事の前回の記入者：${m['記入者']}）`:''; ['staple','side','soup'].forEach(pkSync); staffLock(); renderBowel();
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
$('#infoEdit').onclick=()=>{ const r=D.cur; $('#iRoom').value=r['部屋']||''; $('#iMoveIn').value=r['入居日']||''; $('#iForm').value=r['食事形態']||''; $('#iHistory').value=r['既往歴']||''; $('#iMemo').value=r['メモ']||''; $('#formList2').innerHTML=D.forms.map(f=>`<option value="${esc(f)}">`).join(''); $('#cRows').innerHTML=contactsOf(r.id).map(contactRow).join(''); $('#infoForm').classList.remove('hide'); $('#infoView').classList.add('hide'); };
$('#cRows').addEventListener('click',e=>{ if(e.target.classList.contains('cDel')) e.target.closest('.crow').remove(); });
$('#cAdd').onclick=()=>{ $('#cRows').insertAdjacentHTML('beforeend',contactRow()); };
$('#infoCancel').onclick=()=>{ $('#infoForm').classList.add('hide'); $('#infoView').classList.remove('hide'); };
$('#infoSave').onclick=async()=>{
  const r=D.cur; const rows=[...$('#cRows').querySelectorAll('.crow')].map(row=>{ const o={'氏名':r['氏名']}; row.querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.value.trim()); return o; }).filter(o=>o['事業所']||o['担当者']||o['連絡先']);
  try{ busy(true); const upd=await api('updateResident',{id:r.id,'部屋':$('#iRoom').value.trim(),'入居日':$('#iMoveIn').value,'食事形態':$('#iForm').value.trim(),'既往歴':$('#iHistory').value.trim(),'メモ':$('#iMemo').value.trim()});
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
  const staff=$('#staff').value; if(!staff) return ng('記入者を選んでください（下の「記入者」）',$('#staff')); LSs('hc_staff',staff); LSs('hc_staff_at',String(Date.now())); msg.textContent='';
  const rec={id:(mealOf(r.id,D.meal)||{}).id||'', '日付':D.date,'食事':D.meal,'利用者ID':r.id,'氏名':r['氏名'],'主食':staple,'副食':noMeal?staple:side,'汁物':noMeal?'':segVal('soup'),'服薬':segVal('med'),'服薬時刻':(()=>{ const v=segVal('med'); if(v!=='済') return ''; const cur=mealOf(r.id,D.meal); if(cur&&cur['服薬']==='済'&&cur['服薬時刻']) return cur['服薬時刻']; const n=new Date(); return pad(n.getHours())+':'+pad(n.getMinutes()); })(),'水分':segVal('water'),'食事形態':$('#form').value,
    '症状':$$('#sym button.on').map(b=>b.dataset.v).join(','),'備考':$('#memo').value.trim(),'記入者':staff};
  try{ busy(true); $('#saveMeal').disabled=true; $('#saveMeal').textContent='保存中…'; const saved=await api('saveMeal',{record:rec}); D.day.meals=D.day.meals.filter(m=>!(m['利用者ID']===r.id&&m['食事']===D.meal)); D.day.meals.push(saved); toast(`${r['氏名']} ${D.meal} 保存しました`); msg.style.color='#1f7a3a'; msg.textContent=`✓ ${D.meal} 保存しました`; setTimeout(()=>{ msg.textContent=''; msg.style.color='#c0392b'; },3000); renderEntry(); renderToday(); }
  catch(e){ msg.textContent='⚠ 保存できませんでした: '+e.message; toast('保存失敗: '+e.message); } finally{ busy(false); $('#saveMeal').disabled=false; $('#saveMeal').textContent='保存'; }
};
$('#delMeal').onclick=async()=>{ const r=D.cur; const m=mealOf(r.id,D.meal); if(!m||!confirm(`${r['氏名']} ${D.meal}の記録を消しますか？`)) return; try{ await api('saveMeal',{record:{...m,_delete:true}}); D.day.meals=D.day.meals.filter(x=>x.id!==m.id); renderEntry(); renderToday(); toast('消しました'); }catch(e){toast('失敗: '+e.message);} };
function renderNotes(){ const r=D.cur; const list=D.day.notes.filter(n=>n['利用者ID']===r.id).sort((a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'')); $('#noteList').innerHTML=list.map(n=>`<div class="n"><div class="m">${n['時刻']||''} ${esc(n['種別'])}　${esc(n['記入者'])} <button class="btn danger" data-del="${n.id}" style="padding:1px 8px;font-size:11px;float:right">削除</button></div>${esc(n['内容'])}</div>`).join(''); $$('#noteList [data-del]').forEach(b=>b.onclick=async()=>{ if(!confirm('削除しますか？')) return; await api('saveNote',{record:{id:b.dataset.del,_delete:true}}); api('saveDiary',{record:{id:'n-'+b.dataset.del,_delete:true}}).catch(()=>{}); D.day.notes=D.day.notes.filter(n=>n.id!==b.dataset.del); renderNotes(); renderToday(); }); }
$('#saveNote').onclick=async()=>{
  const r=D.cur; const text=$('#nText').value.trim(); if(!text) return toast('内容を入れてください'); const staff=$('#staff').value; if(!staff) return toast('記入者を選んでください'); LSs('hc_staff',staff); LSs('hc_staff_at',String(Date.now()));
  const rec={'日付':D.date,'時刻':$('#nTime').value||`${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`,'利用者ID':r.id,'氏名':r['氏名'],'種別':$('#nKind').value,'内容':text,'記入者':staff};
  const nb=$('#saveNote'); if(nb.disabled) return; nb.disabled=true; nb.textContent='追加中…';
  try{ busy(true); const saved=await api('saveNote',{record:rec}); D.day.notes.push(saved); $('#nText').value=''; $('#nTime').value=''; renderNotes(); renderToday(); toast('追加しました（日誌にも記録）');
    // 様子・特記はそのまま個人日誌にも載せる（id を n-様子ID にして、様子を消したら日誌も消えるようにする）
    api('saveDiary',{record:{id:'n-'+saved.id,'日付':rec['日付'],'時刻':rec['時刻'],'利用者ID':rec['利用者ID'],'氏名':rec['氏名'],'種別':rec['種別'],'内容':rec['内容'],'記入者':staff,'出所':'様子記録'}}).catch(()=>{});
  }catch(e){toast('失敗: '+e.message);} finally{busy(false); nb.disabled=false; nb.textContent='様子を追加';}
};

// ===== 日誌 =====
const DKINDS=['排泄','服薬','食事','体調','オンコール','受診・訪問診療','家族','様子','連絡','その他'];
const HKINDS=['見学者対応','今後の予定','連絡','行事','設備','モーニングコール','その他']; // ハウス全体の業務日誌（アロハ花子）
$('#dMode').onchange=()=>{ $('#dRes').classList.toggle('hide',$('#dMode').value!=='month'); renderDiary(); };
// ===== 業務日誌（1日分を自動でまとめる：予定・ハウス全体の記録・入居者ごとの食事/モーニングコール/排便/個人日誌・LINE。毎日印刷してファイルに綴じる 2026/11/22）=====
async function gyomuHtml(){ const [list,_]=await Promise.all([api('diaryList',{date:D.date}),Promise.resolve()]); const sortT=(a,b)=>(a['時刻']||'').localeCompare(b['時刻']||''); const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
  const nm=Object.fromEntries(D.residents.map(r=>[r.id,r])); nm['']={'部屋':'—','氏名':'アロハハウス'};
  const sch=(D.day.schedules||[]).filter(s=>nm[s['利用者ID']]).sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始'])));
  const house=list.filter(e=>e['利用者ID']===''&&!String(e.id||'').startsWith('ocd-')).concat(houseExt().map(e=>({'時刻':e['時刻'],'種別':e['種別'],'内容':e['内容'],'記入者':e['記録者'],'出所':e['出所']}))).sort(sortT);
  const ent=e=>`<div class="gn"><span class="gm">${esc(e['時刻']||'')} ${esc(e['種別']||'')}${e['出所']&&e['出所']!=='手入力'?'〔'+esc(e['出所'])+'〕':''}${e['記入者']&&e['記入者']!=='LINE'?' '+esc(e['記入者']):''}</span> ${esc(e['内容'])}</div>`;
  const mealTxt=m=>{ const x=mealOf(m[0],m[1]); if(!x) return '未'; if(x['主食']==='注文なし') return 'なし'; if(x['主食']==='欠') return '欠食'; return `${x['主食']}/${x['副食']}${x['汁物']&&x['汁物']!=='なし'?'/'+x['汁物']:''}${x['服薬']==='済'?' 薬✓':x['服薬']==='未'?' 薬未':''}${x['症状']?' '+x['症状']:''}`; };
  const strip=h=>String(h).replace(/<[^>]+>/g,'');
  let h=`<div class="gyomu"><div class="ghead"><h2>アロハハウス　業務日誌　${D.date.slice(0,4)}年${dateLabel(D.date)}</h2><table class="gstamp"><tr><th>記入</th><th>確認</th><th>管理者</th></tr><tr><td id="gStampName" style="font-size:10px">${esc(LS('hc_gyomu_'+D.date)||'')}</td><td></td><td></td></tr></table></div>`;
  try{ const kk=await portalApi('kakuninByDate',{date:D.date}); window._kkDay=kk||[]; }catch(e){ window._kkDay=null; }
  h+=`<h3>今日の予定</h3>`+(sch.length?`<table class="gt"><tr><th style="width:80px">時間</th><th style="width:110px">氏名</th><th>予定</th><th style="width:70px">担当</th></tr>${sch.map(s=>`<tr><td>${esc(s['開始']||'')}${s['終了']?'-'+esc(s['終了']):''}</td><td>${esc(nm[s['利用者ID']]['氏名'])}</td><td>${esc(fmtSch({...s,'開始':'','担当':''}))}</td><td>${esc(s['担当']||'')}</td></tr>`).join('')}</table>`:'<p class="muted">予定なし</p>');
  h+=`<h3>ハウス全体（見学者対応・今後の予定・LINEの連絡など）</h3>`+(house.length?house.map(ent).join(''):'<p class="muted">記録なし</p>');
  if(window._kkDay&&window._kkDay.length) h+=`<h3>職員に知らせた確認事項</h3>`+window._kkDay.map(x=>{ const a=Object.values(x.ack||{}); return `<div class="gn"><span class="gm">${esc(lwT(x.at))} ${esc(x.group)}・${esc(x.from)}</span> ${esc(x.title)}　<b>確認済み：${a.length?a.map(y=>esc(y.name)).join("・"):"まだ"}</b></div>`; }).join('');
  h+=`<h3>入居者ごとの記録</h3><table class="gt"><tr><th style="width:110px">部屋・氏名</th><th style="width:150px">食事（主/副/汁）</th><th>モーニングコール・排便・個人日誌・LINE</th></tr>`+D.residents.map(r=>{ const es=list.filter(e=>e['利用者ID']===r.id&&e['出所']!=='デイ記録'&&e['種別']!=='モーニングコール').sort(sortT); const mc=mcOf(r.id); const dayH=dayActsHtml(r.id); const bw=D.day.notes.filter(n=>n['利用者ID']===r.id&&n['種別']==='排便');
    const ids=new Set(es.map(e=>e.id)); const notes=D.day.notes.filter(n=>n['利用者ID']===r.id&&!['モーニングコール','排便'].includes(n['種別'])&&!ids.has('n-'+n.id));
    return `<tr><td>${esc(r['部屋'])}<br><b>${esc(r['氏名'])}</b></td><td style="font-size:9.5pt">朝 ${esc(mealTxt([r.id,'朝食']))}<br>昼 ${esc(mealTxt([r.id,'昼食']))}<br>夕 ${esc(mealTxt([r.id,'夕食']))}</td><td>${mc.length?`<div class="gn"><span class="gm">モーニングコール</span> ${mc.map(x=>esc(x['時刻']+' '+x['内容']+'（'+x['記入者']+'）')).join('、')}</div>`:''}<div class="gn"><span class="gm">排便</span> ${bw.length?bw.map(x=>esc(x['時刻']+' '+x['内容'])).join('、'):esc(strip(bowelBadge(r.id)))}</div>${dayH}${es.concat(notes).sort(sortT).map(ent).join('')}</td></tr>`; }).join('')+'</table></div>';
  return h; }
$('#dRes').onchange=()=>renderDiary();
$('#dPrint').onclick=()=>{ if($('#dMode').value==='gyomu'&&!($('#gStaff')&&$('#gStaff').value)){ toast('業務日誌の「記入者」を選んでから印刷してください'); const g=$('#gStaff'); if(g){ g.scrollIntoView({block:'center'}); g.style.outline='3px solid #c0392b'; setTimeout(()=>g.style.outline='',2500); } return; } document.body.classList.add('print-diary'); const off=()=>document.body.classList.remove('print-diary'); window.addEventListener('afterprint',off,{once:true}); setTimeout(()=>window.print(),50); setTimeout(off,60000); };
function diaryEntry(e,showName){ return `<div class="n" data-did="${e.id}"><div class="m">${e['時刻']||''} ${esc(e['種別']||'')}${showName?'　'+esc(e['氏名']):''}　<span class="muted">${esc(e['出所']||'')}${e['記入者']&&e['記入者']!=='LINE'?' '+esc(e['記入者']):''}</span> <button class="btn danger noprint" data-ddel="${e.id}" style="padding:1px 8px;font-size:11px;float:right">削除</button></div>${esc(e['内容'])}</div>`; }
async function renderDiary(){
  const out=$('#diaryOut'); const mode=$('#dMode').value;
  $('#dRes').innerHTML=D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join('');
  out.innerHTML='<div class="muted">読み込み中…</div>';
  try{
    if(mode==='gyomu'){ out.innerHTML='<div class="card noprint" style="padding:8px 12px">この日の予定・ハウス全体の記録・入居者ごとの食事／モーニングコール／排便・個人日誌・LINEの内容を自動でまとめています。上の「印刷」で毎日印刷してファイルに綴じてください。<button class="btn" id="gAdd" style="margin-left:6px">書き足す（ハウス全体・個人日誌）</button><div class="row" style="margin-top:8px;align-items:center"><b style="flex:none">業務日誌の記入者（必須）</b><select id="gStaff"><option value="">（選択）</option>'+D.staff.map(x=>`<option ${x===(LS('hc_gyomu_'+D.date)||'')?'selected':''}>${esc(x)}</option>`).join('')+'</select></div></div><div class="card">'+await gyomuHtml()+'</div>'; $('#gAdd').onclick=()=>{ $('#dMode').value='day'; renderDiary(); }; $('#gStaff').onchange=()=>{ LSs('hc_gyomu_'+D.date,$('#gStaff').value); const c=$('#gStampName'); if(c) c.textContent=$('#gStaff').value; }; return; }
    if(mode==='sort'){ await renderSort(out); return; }
    if(mode==='day'){
      const list=await api('diaryList',{date:D.date}); let kkL=[]; try{ kkL=(await portalApi('kakuninByDate',{date:D.date}))||[]; }catch(e){} const kkOf=r=>kkL.filter(x=>r.id?x.resident===r['氏名']:!x.resident).map(x=>{ const a=Object.values(x.ack||{}); return `<div class="n" style="background:#fff7e6;border-radius:6px;padding:4px 6px;margin-top:4px"><div class="m">📣 職員に知らせた確認事項　${esc(lwT(x.at))}　${esc(x.group)}・${esc(x.from||'')}</div>${esc(x.title)}<br><b>確認済み：${a.length?a.map(y=>esc(y.name)).join('・'):'まだ誰も確認していません'}</b></div>`; }).join(''); /* 確認した人の名前を日誌に出す 2026/11/22 */ const curStaff=$('#staff').value||LS('hc_staff')||''; const staffOpts='<option value="">（選択）</option>'+D.staff.map(s=>`<option ${s===curStaff?'selected':''}>${esc(s)}</option>`).join(''); const sortT=(a,b)=>(a['時刻']||'').localeCompare(b['時刻']||'');
      out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">アロハハウス　個人日誌　${D.date.slice(0,4)}年${dateLabel(D.date)}</h2>`+[HOUSE_R].concat(D.residents).map(r=>{ const hasDay=r.id&&dayActs(r.id); const es=list.filter(e=>e['利用者ID']===r.id&&!(hasDay&&e['出所']==='デイ記録')).sort(sortT); const K=r.id?DKINDS:HKINDS;
        return `<div class="card" style="page-break-inside:avoid${r.id?'':';border:2px solid var(--pri)'}"><div class="row" style="align-items:center"><h2 style="margin:0;flex:1;font-size:14px">${esc(r['部屋'])}　${esc(r['氏名'])}</h2><button class="btn noprint" data-dadd="${r.id}" style="flex:none;padding:4px 10px">＋ 追加</button><button class="btn noprint" data-kk="${r.id}" style="flex:none;padding:4px 10px;margin-left:4px">📣 知らせる</button></div><div class="dform hide" data-dform="${r.id}" style="margin-top:6px"><div class="row"><input type="time" data-k="時刻" style="flex:none;width:110px"><select data-k="種別" style="flex:none;width:140px">${K.map(k=>`<option>${k}</option>`).join('')}</select></div><div class="row" style="margin-top:4px;align-items:center"><span style="flex:none">記入者</span><select data-k="記入者">${staffOpts}</select></div><textarea data-k="内容" placeholder="記録（事実を短く）" style="min-height:64px;margin-top:4px"></textarea><div class="row" style="margin-top:4px"><button class="btn pri" data-dsave="${r.id}" style="flex:none">保存</button><button class="btn" data-dcancel="${r.id}" style="flex:none">閉じる</button></div></div>${r.id?dayActsHtml(r.id):''}${es.length?es.map(e=>diaryEntry(e,false)).join(''):'<div class="muted">記録なし</div>'}${kkOf(r)}</div>`; }).join('');
    } else {
      const rid=$('#dRes').value; const r=D.residents.find(x=>x.id===rid); if(!r) return; const ym=D.date.slice(0,7);
      const list=(await api('diaryList',{ym,residentId:rid})).sort((a,b)=>(a['日付']+a['時刻']).localeCompare(b['日付']+b['時刻']));
      const byDay={}; list.forEach(e=>{ (byDay[e['日付']]=byDay[e['日付']]||[]).push(e); });
      const [y,mo]=ym.split('-').map(Number);
      out.innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">アロハハウス　個人日誌　${esc(r['氏名'])} 様　${y}年${mo}月</h2>`+(Object.keys(byDay).length?Object.keys(byDay).sort().map(d=>`<div class="card" style="page-break-inside:avoid"><h2 style="margin:0 0 4px;font-size:14px">${dateLabel(d)}</h2>${byDay[d].map(e=>diaryEntry(e,false)).join('')}</div>`).join(''):'<div class="card muted">この月の日誌はありません</div>');
    }
    if(D.diaryFocus){ const el=out.querySelector(`[data-did="${CSS.escape(D.diaryFocus)}"]`); D.diaryFocus=''; if(el){ el.style.background='#fff3c4'; el.style.outline='3px solid var(--pri)'; el.style.borderRadius='6px'; setTimeout(()=>el.scrollIntoView({block:'center'}),50); } }
    $$('#diaryOut [data-kk]').forEach(b=>b.onclick=()=>openKK(b.dataset.kk)); if(D.hxFocus) out.insertAdjacentHTML('afterbegin',`<div class="card" style="background:#fff7e6;border:2px solid var(--pri)"><b>ハウス全体の記録から：</b>${esc(D.hxFocus)}<br><span class="muted">対応した入居者の「＋ 追加」から個人日誌に書いてください。書いたら「📣 知らせる」で職員に確認を頼めます。</span> <button class="btn" onclick="D.hxFocus='';this.closest('.card').remove()" style="padding:2px 10px">閉じる</button></div>`);
    $$('#diaryOut [data-dadd]').forEach(b=>b.onclick=()=>{ const f=$(`#diaryOut [data-dform="${b.dataset.dadd}"]`); f.classList.toggle('hide'); if(!f.querySelector('[data-k="時刻"]').value){ const n=new Date(); f.querySelector('[data-k="時刻"]').value=`${pad(n.getHours())}:${pad(n.getMinutes())}`; } });
    $$('#diaryOut [data-dcancel]').forEach(b=>b.onclick=()=>$(`#diaryOut [data-dform="${b.dataset.dcancel}"]`).classList.add('hide'));
    $$('#diaryOut [data-dsave]').forEach(b=>b.onclick=async()=>{ const rid=b.dataset.dsave; const r=rid?D.residents.find(x=>x.id===rid):HOUSE_R; const f=$(`#diaryOut [data-dform="${rid}"]`); const text=f.querySelector('[data-k="内容"]').value.trim(); if(!text) return toast('内容を入れてください'); const staff=f.querySelector('[data-k="記入者"]').value; if(!staff) return toast('記入者を選んでください'); LSs('hc_staff',staff); LSs('hc_staff_at',String(Date.now())); if($('#staff')) $('#staff').value=staff;
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
  { const sel=$('#lRes'); const cur=sel.value; sel.innerHTML=D.residents.map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join(''); if(cur&&D.residents.some(r=>r.id===cur)) sel.value=cur; } // 選び直しても先頭の人に戻らないように
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
  } else if(mode==='staff'){
    // この日の予定を担当職員ごとにまとめる（印刷して各自が持てるように）。担当が空の予定は最後に「担当なし」
    const nm=Object.fromEntries(D.residents.map(r=>[r.id,r])); nm['']={id:'','部屋':'—','氏名':'アロハハウス'};
    const tk=t=>{ t=t||'99:99'; return /^\d:/.test(t)?'0'+t:t; };
    const body=s=>fmtSch({...s,'開始':'','担当':''});
    // お金（お小遣い・買い物）の予定は担当が空でも、同じ日のその方の訪介の生活援助（身○生○・生○）と一緒にやるので、その訪介の担当の欄に並べる
    const all=(D.day.schedules||[]).filter(s=>!s['利用者ID']||nm[s['利用者ID']]);
    const withVisit=s=>{ if(s['種別']!=='お金'||String(s['担当']||'').trim()||!s['利用者ID']) return null; return all.filter(v=>v['利用者ID']===s['利用者ID']&&v['種別']==='訪介'&&/生/.test(v['内容']||'')&&String(v['担当']||'').trim()).sort((a,b)=>tk(a['開始']).localeCompare(tk(b['開始'])))[0]||null; };
    const g={}; for(const s0 of all){ const v=withVisit(s0); const s=v?{...s0,_with:v}:s0; const k=v?String(v['担当']).trim():(String(s['担当']||'').trim()||'担当なし'); (g[k]=g[k]||[]).push(s); }
    const keys=Object.keys(g).sort((a,b)=>(a==='担当なし')-(b==='担当なし')||a.localeCompare(b,'ja'));
    const d=new Date(D.date+'T00:00:00');
    out.innerHTML=`<div class="stf"><h2 style="font-size:16px;margin:0 0 6px">アロハハウス　職員ごとの予定　${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WD[d.getDay()]}）</h2>`+
      (keys.length?keys.map(k=>{ const sk=s=>s._with?tk(s._with['開始'])+'~':tk(s['開始']); const l=g[k].sort((a,b)=>sk(a).localeCompare(sk(b))); return `<div class="grp"><h3>${esc(k)}　<span style="font-weight:400;font-size:12px">${l.length}件</span></h3><table class="grid" style="width:100%"><tr><th style="width:90px">時間</th><th style="width:44px">部屋</th><th style="width:110px">氏名</th><th>予定</th><th>備考</th></tr>`+
        l.map(s=>{ const r=nm[s['利用者ID']]; return `<tr><td>${s._with?'<small>上の訪介と一緒に</small>':esc(s['開始']||'')+(s['終了']?'-'+esc(s['終了']):'')}</td><td>${esc(r['部屋'])}</td><td class="l">${esc(r['氏名'])}</td><td style="text-align:left"><span class="sch ${schCls(s)}">${esc(body(s))}</span>${s._with?`<br><small>${esc(s._with['開始']||'')} ${esc(body(s._with))} のときに一緒に</small>`:''}</td><td class="memo"></td></tr>`; }).join('')+'</table></div>'; }).join(''):'<p class="muted">この日の予定はありません</p>')+
      '<div class="legend">担当は予定の「担当」欄（カイポケの訪問介護シフトなど）から出しています。お金（お小遣い・買い物）は、その日のその方の訪介の生活援助の担当の欄に並べています。日付は「今日の予定/食事」タブで変えられます。</div></div>';
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
      let h=`<div class="calsheet"><div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px"><h2 style="margin:0;font-size:17px">${esc(r['氏名'])} 様　週間予定表</h2><span class="muted">${days[0].getFullYear()}年${days[0].getMonth()+1}月${days[0].getDate()}日〜${days[6].getMonth()+1}月${days[6].getDate()}日</span><span style="margin-left:auto;font-size:11px"><span class="sch nurse">訪問看護</span><span class="sch rehab">訪問リハ</span><span class="sch helper">訪問介護</span><span class="sch day">デイ</span><span class="sch manual">往診・受診・入院等</span><span class="sch money">お金</span></span></div><table class="cal week"><thead><tr>`;
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
        out.innerHTML=calendarHtml(ym,by,`${esc(r['氏名'])} 様　予定表`,`（${m.schedules.length}件）`,'<span class="sch nurse">訪問看護</span><span class="sch rehab">訪問リハ</span><span class="sch helper">訪問介護</span><span class="sch day">デイ</span><span class="sch manual">往診・受診・入院等</span><span class="sch money">お金</span>');
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
function fillSchRes(){ const o=(D.activeResidents||D.residents).map(r=>`<option value="${r.id}">${esc(r['氏名'])}</option>`).join(''); $('#sRes').innerHTML=o+'<option value="">アロハハウス（全員）</option><option value="day">アロハデイ（その日デイに行く方）</option>'; $('#sRes').onchange=()=>{ if($('#sRes').value==='day'){ $('#sKind').value='デイ'; } }; $('#sListRes').innerHTML='<option value="">全員</option>'+o; }
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
(function(){ const DEF='dnamjejphndliflbofjgekcnfclnhkcd'; const inp=$('#extId'), a=$('#extOpen'), st=$('#extStat'); if(!inp||!a) return;
  // 拡張機能（1.6.1以降）はこのページを開いたときに自分のIDを localStorage(hc_ext_id) に書き込むので、それを最優先で使う
  const curId=()=>(LS('hc_ext_id')||inp.value.trim()||DEF).trim();
  inp.value=LS('hc_ext_id')||DEF; const upd=()=>{ a.href='chrome-extension://'+curId()+'/sync.html'; }; upd();
  inp.onchange=()=>{ LSs('hc_ext_id',inp.value.trim()); upd(); };
  const isPcChrome=/Chrome/.test(navigator.userAgent)&&!/Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  // 接続確認（拡張機能が入っていて動いているか）
  const ping=()=>new Promise(res=>{ if(!isPcChrome||!(window.chrome&&chrome.runtime&&chrome.runtime.sendMessage)) return res(null); try{ chrome.runtime.sendMessage(curId(),{type:'ping'},r=>{ if(chrome.runtime.lastError||!r||!r.ok) res(false); else res(r); }); }catch(e){ res(false); } });
  const showStat=async()=>{ if(!st||!isPcChrome) return; const r=await ping(); st.textContent=r?`拡張機能 v${r.version||''} 接続OK`:'拡張機能が見つかりません（chrome://extensions で「アロハハウス カイポケ記録同期」が有効か確認。入れ直したときはこのページを一度再読み込み）'; st.style.color=r?'#2e7d32':'#b3261e'; };
  showStat();
  a.onclick=e=>{ upd(); if(!isPcChrome){ e.preventDefault(); toast('この画面はパソコンのChrome（拡張機能を入れたもの）で開いてください'); return; } if(window.chrome&&chrome.runtime&&chrome.runtime.sendMessage){ e.preventDefault(); try{ chrome.runtime.sendMessage(curId(),{type:'openSync'},r=>{ if(chrome.runtime.lastError||!r||!r.ok){ showStat(); const w=window.open(a.href,'_blank'); if(!w) toast('同期画面を開けませんでした。拡張機能が有効か確認してください'); } }); }catch(err){ window.open(a.href,'_blank'); } } }; })();
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
  const kinds=['訪看','訪リハ','訪介','デイ','訪問診療','受診','入院','退院','外出','面会','行事','その他']; if(!kinds.includes(s['種別'])) kinds.unshift(s['種別']);
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
async function importLineFile(f, st, ym, opts){ opts=opts||{};
  const [y,m]=ym.split('-').map(Number);
  // 進み具合を「⏳ 何をしているか（経過秒）」で見せる（AIの整理とGASの保存で1〜2分かかることがある）
  const t0=Date.now(); let curStep=''; const tick=()=>{ if(curStep) st.innerHTML=`<span style="font-weight:700;color:#7a5a00">⏳ ${esc(curStep)}</span> <span class="muted">（${Math.round((Date.now()-t0)/1000)}秒経過）</span>`; }; const tm=setInterval(tick,1000); const step=x=>{ curStep=x; tick(); };
  try{ busy(true); step('トーク履歴を読み込み中'); const text=new TextDecoder('utf-8').decode(await f.arrayBuffer());
    const parsed=parseLine(text); const all=parsed.filter(g=>g.y===y&&g.m===m);
    const names=D.residents.map(r=>r['氏名']); const sns=names.map(surnameOf).filter(s=>s.length>=2);
    const gProf=k=>{ const r=(D.profiles||[]).find(p=>p['利用者ID']===''&&p['キー']===k); if(!r) return null; try{ return JSON.parse(r['値']); }catch(e){ return null; } }; const sProf=async(k,v)=>{ await api('saveProfile',{residentId:'',key:k,value:v}); D.profiles=(D.profiles||[]).filter(p=>!(p['利用者ID']===''&&p['キー']===k)); D.profiles.push({'利用者ID':'','キー':k,'値':JSON.stringify(v)}); };
    if(!all.length){ const months=[...new Set(parsed.map(g=>`${g.y}-${pad(g.m)}`))].sort(); throw new Error(`${ym}の投稿がありません（このファイルにある月：${months.slice(-6).join('、')}）`); }
    // トークルームの識別：先頭の「[LINE] ○○のトーク履歴」があればその名前、なければ投稿の多い送信者の顔ぶれで見分ける（全体グループと○○様グループを別々に数えるため）
    const hm=text.match(/\[LINE\]\s*(.+?)(?:との|の)トーク履歴/); let room;
    if(hm) room=hm[1].trim().slice(0,40); else { const c={}; parsed.forEach(g=>{ if(g.sender&&!/をグループに追加しました|送信を取り消しました/.test(g.text)) c[g.sender]=(c[g.sender]||0)+1; }); const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]).sort(); let h=0; for(const ch of top.join('|')){ h=(h*31+ch.charCodeAt(0))>>>0; } room='r'+h.toString(36); }
    // ご家族グループ（特定の入居者の関係者とのトーク）：選んだ入居者を覚えて、次回から自動で同じ方にする
    const lrSel=opts.useSel===false?null:$('#lineRes'); const roomMap=gProf('line_room')||{}; let focusId=(lrSel&&lrSel.value)||roomMap[room]||''; /* 複数ファイル同時のときは手で選んだ入居者は使わず、覚えている対応だけ使う */ if(lrSel&&!lrSel.value&&focusId){ lrSel.value=focusId; if(lrSel.value!==focusId) focusId=''; }
    const focusRes=focusId?D.residents.find(r=>r.id===focusId):null; const focus=focusRes?focusRes['氏名']:'';
    // LINEは利用者・ご家族のLINEだけ取り込む（職員の連絡はポータルのトークから取り込む）2026/11/25
    // 2026/11/26：職員のLINEグループの取り込みも当面は残す（前垣さん「まだLINEトーク取込機能はいれといて」）
    if(lrSel&&lrSel.value&&roomMap[room]!==lrSel.value){ roomMap[room]=lrSel.value; await sProf('line_room',roomMap); } else if(lrSel&&!lrSel.value&&roomMap[room]&&!focusId){ delete roomMap[room]; await sProf('line_room',roomMap); }
    // 前回どこまで読んだか（月×トークルームごとのカーソル）。最後に読んだ投稿を探して、その続きだけ対象にする
    const sig=g=>`${g.y}-${pad(g.m)}-${pad(g.d)} ${g.time||''} ${(g.sender||'')}|${String(g.text).slice(0,120)}`;
    const redo=$('#lineRedo')&&$('#lineRedo').checked; const curKey='line_cursor:'+ym+':'+room; let cur=redo?null:gProf(curKey);
    const findIdx=c=>{ let idx=-1; for(let k=Math.min(c.n||all.length,all.length)-1;k>=0;k--){ if(sig(all[k])===c.last){ idx=k; break; } } if(idx<0) idx=all.findIndex(g=>sig(g)===c.last); return idx; };
    // 旧版（ルーム別になる前）のカーソルは、その「最後に読んだ投稿」がこのファイルにあるときだけ引き継ぐ（別のグループのカーソルで読み飛ばさないように）
    let legacy=false; if(!cur&&!redo){ const old=gProf('line_cursor:'+ym); if(old&&old.last&&findIdx(old)>=0){ cur=old; legacy=true; } }
    let start=0;
    if(cur&&cur.last){ const idx=findIdx(cur); if(idx>=0) start=idx+1; else if(cur.lastAt){ start=all.findIndex(g=>`${g.y}-${pad(g.m)}-${pad(g.d)} ${g.time||''}`>cur.lastAt); if(start<0) start=all.length; } }
    // このルームのカーソルがなく、旧版で取り込んだLINE抽出がこの月にあるときは、その最終日以降の投稿から読む（前の分を二重に入れないため）
    if(!cur&&!redo){ try{ const mo=await api('month',{ym}); const leg=(mo.ext||[]).filter(r=>r['取込キー']===ym+'|LINE').map(r=>r['日付']).sort(); if(leg.length){ const maxD=leg[leg.length-1]; const k=all.findIndex(g=>`${g.y}-${pad(g.m)}-${pad(g.d)}`>=maxD); start=k<0?all.length:k; } }catch(e){} }
    const fresh=all.slice(start);
    const isSys=t=>/^(画像|動画|スタンプ|\[投票|\[投票終了|.*をグループに追加しました。?$|.*がグループのプロフィール画像を変更しました。?$|メッセージの送信を取り消しました|\(emotional\))/.test(t)||(/https?:\/\//.test(t)&&t.length<80);
    const picked=fresh.filter(g=>{ const t=g.text; if(isSys(t)) return false; if(focus) return true; return sns.some(s=>t.indexOf(s)>=0) || RE_HOUSE_KW.test(t) || /オンコール/.test(g.sender||'') || /^\[アロハハウス/.test(t); /* ポータルのアロハハウスグループは名前がなくても読む */ })
      .map(g=>({date:`${g.y}-${pad(g.m)}-${pad(g.d)}`,time:g.time,sender:g.sender,text:g.text.slice(0,600)}));
    const lastOf=g=>`${g.y}/${g.m}/${g.d} ${g.time||''}`;
    const saveCursor=async()=>{ const last=all[all.length-1]; await sProf(curKey,{n:all.length,last:sig(last),lastAt:`${last.y}-${pad(last.m)}-${pad(last.d)} ${last.time||''}`,at:new Date().toISOString()}); };
    const roomLabel=focus?`${focus}のご家族グループ`:(hm?room:'このトークルーム');
    if(!fresh.length){ if(legacy) await saveCursor(); curStep=''; st.innerHTML=`<span style="font-weight:700;color:#1f7a3a">✓ 取り込み済み</span>　${esc(roomLabel)}：${lastOf(all[all.length-1])}の投稿まで取り込み済みで、新しい投稿はありません（そのあとの投稿があるなら、LINEからトーク履歴を書き出し直してください）`; return; }
    if(!picked.length){ await saveCursor(); curStep=''; st.innerHTML=`<span style="font-weight:700;color:#1f7a3a">✓ 確認済み</span>　${esc(roomLabel)}：新しい投稿${fresh.length}通（〜${lastOf(all[all.length-1])}）に入居者に関するものはありませんでした（次回はこの続きから読みます）`+(focus?'':'。特定の入居者のご家族グループなら、「対象の入居者」を選んでから入れ直してください'); return; }
    const impKey=ym+'|LINE|'+room; const extraKeys=[]; // 取込キーはルーム別。旧版のキー（ym|LINE）の分は消さない（他のルームの分が混ざっているため）
    const msg=start>0?`${roomLabel}：${ym}の新着${fresh.length}通のうち ${picked.length}通をAIで抽出します（前回の続き。既存の抽出は残します）。よろしいですか？`:`${roomLabel}：${ym}の投稿${all.length}通のうち ${picked.length}通をAIで抽出します。よろしいですか？（既にあるこのグループの${ym}のLINE抽出は置き換えます）`;
    if(!opts.noConfirm&&!confirm(msg)) { curStep=''; st.textContent='中止しました'; return; }
    const CH=60; let total=0, totalDiary=0, totalSch=0, totalMeals=0; const byName=new Map(D.residents.map(r=>[normName(r['氏名']),r]));
    const nchunk=Math.ceil(picked.length/CH);
    for(let i=0;i<picked.length;i+=CH){ const ci=Math.floor(i/CH)+1; const pre=nchunk>1?`（${ci}/${nchunk}回目）`:'';
      step(`AIが投稿を整理中 ${Math.min(i+CH,picked.length)}/${picked.length}通${pre}…30秒〜1分ほどかかります`);
      const res=await api('extractLine',{residents:names,messages:picked.slice(i,i+CH),focus});
      step(`記録を保存中${pre}`);
      const rows=res.items.map(it=>{ const r=byName.get(normName(it.resident))||focusRes; return r?{'日付':it.date,'時刻':it.time,'利用者ID':r.id,'氏名':r['氏名'],'種別':it.kind,'内容':it.content,'記録者':'','出所':'LINE'}:null; }).filter(Boolean).filter(r=>r['日付'].slice(0,7)===ym);
      // ハウス全体の出来事（地震・設備・オンコールの全体報告など）は利用者IDなしの行として保存し、今日の予定カードと「この日の全員」に表示
      (res.house||[]).forEach(it=>{ if(String(it.date||'').slice(0,7)===ym) rows.push({'日付':it.date,'時刻':it.time,'利用者ID':'','氏名':'（全体）','種別':it.kind||'','内容':it.text,'記録者':'','出所':'LINE'}); });
      await api('importExt',{key:impKey,extraKeys,rows,append:start>0||i>0}); total+=rows.length;
      // 個人日誌
      const drows=(res.diary||[]).map(it=>{ const r=byName.get(normName(it.resident))||focusRes; return r?{'日付':it.date,'時刻':it.time,'利用者ID':r.id,'氏名':r['氏名'],'種別':it.kind,'内容':it.text,'記入者':'LINE','出所':'LINE'}:null; }).filter(Boolean).filter(r=>r['日付'].slice(0,7)===ym);
      if(drows.length){ step(`日誌を保存中${pre}`); await api('importDiary',{key:impKey,extraKeys,rows:drows,append:start>0||i>0}); totalDiary+=drows.length; }
      // 予定（入居者個人／アロハハウス全体）：追加のみ
      const kindMap=k=>({'訪看':'訪看','訪介':'訪介','受診':'受診','往診':'訪問診療','訪問診療':'訪問診療','入院':'入院','退院':'退院','面会':'面会','外出':'外出','行事':'行事','業者':'業者','会議':'会議'})[k]||'その他';
      const srows=(res.schedules||[]).map(it=>{ if(it.resident==='アロハハウス') return {'日付':it.date,'利用者ID':'','氏名':'アロハハウス','種別':kindMap(it.kind),'開始':it.time||'','終了':'','内容':it.content,'担当':''}; const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'利用者ID':r.id,'氏名':r['氏名'],'種別':kindMap(it.kind),'開始':it.time||'','終了':'','内容':it.content,'担当':''}:null; }).filter(Boolean);
      const byYm={}; srows.forEach(r=>{ (byYm[r['日付'].slice(0,7)]=byYm[r['日付'].slice(0,7)]||[]).push(r); });
      for(const [sym,list] of Object.entries(byYm)){ step(`予定を保存中${pre}`); const a=await api('importSchedules',{ym:sym,source:'LINE',rows:list,append:true}); totalSch+=a.added; }
      // 食事量（「完食」など）→ 食事記録へ（職員が入力済みのものは上書きしない）
      const mrows=(res.meals||[]).map(it=>{ const r=byName.get(normName(it.resident)); return r?{'日付':it.date,'利用者ID':r.id,'氏名':r['氏名'],'食事':it.meal,'主食':it.staple,'副食':it.side,'汁物':it.soup,'水分':it.water,'症状':it.sym||'','備考':'LINEより'}:null; }).filter(Boolean);
      if(mrows.length){ step(`食事記録を保存中${pre}`); try{ const a=await api('autoMeals',{rows:mrows,source:'LINE'}); totalMeals+=a.saved||0; }catch(e){} }
    }
    step('仕上げ中'); await saveCursor(); stampImport([opts.stamp||'LINE']); curStep='';
    st.innerHTML=`<span style="font-weight:700;color:#1f7a3a">✓ 完了</span>　${esc(roomLabel)} ${start>0?'新着':''}${picked.length}通 → 記録${total}件・日誌${totalDiary}件・予定${totalSch}件・食事${totalMeals}件を保存しました（${Math.round((Date.now()-t0)/1000)}秒）。日誌タブと予定タブで確認し、違うものは削除してください`;
    loadDay(); if($('#p-set').classList.contains('on')) loadExtList();
  }catch(err){ curStep=''; st.innerHTML='<span style="color:#b3261e;font-weight:700">⚠ エラー</span> '+esc(err.message); console.error(err); } finally{ clearInterval(tm); busy(false); }
}
// ===== アロハ業務ポータルのトークの取り込み（AI）2026/11/25 =====
// ポータルの「アロハハウス」グループ・入居者の担当グループと、入居者の名前が出てくるトークを読み、LINEと同じしくみで予定・日誌・記録に入れる（どこまで読んだかは月ごとに覚える）
async function importPortalTalk(){ const st=$('#ptStatus'); if(!st) return;
  try{ st.textContent='ポータルのトークを読んでいます…';
    const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth()-1,1);
    const names=D.residents.map(r=>r['氏名']);
    const list=await portalApi('houseTalk',{names,since:from.getTime()});
    if(!list||!list.length){ st.innerHTML='<span style="font-weight:700;color:#1f7a3a">✓ 確認済み</span>　入居者に関するトークはありませんでした'; stampImport(['ポータル']); return; }
    const WDJ='日月火水木金土'; const byYm={};
    list.sort((a,b)=>a.at-b.at).forEach(m=>{ const d=new Date(m.at); const ym=`${d.getFullYear()}-${pad(d.getMonth()+1)}`; (byYm[ym]=byYm[ym]||[]).push(m); });
    const yms=Object.keys(byYm).sort(); let done=[];
    for(const ym of yms){ let txt='[LINE] アロハ業務ポータルのトーク履歴\n'; let lastD='';
      for(const m of byYm[ym]){ const d=new Date(m.at); const ds=`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}(${WDJ[d.getDay()]})`; if(ds!==lastD){ txt+=ds+'\n'; lastD=ds; }
        const body=String(m.text||'').replace(/^(\d{4}[.\/-]\d)/gm,' $1').replace(/^(\d{1,2}:\d{2})/gm,' $1'); txt+=`${pad(d.getHours())}:${pad(d.getMinutes())}\t${String(m.by||'').replace(/\t/g,' ')}\t[${m.group||'個別'}] ${body}\n`; }
      const sub=document.createElement('div'); st.innerHTML=''; st.appendChild(sub);
      await importLineFile(new Blob([txt],{type:'text/plain'}), sub, ym, {useSel:false, noConfirm:true, stamp:'ポータル'});
      done.push(`${ym}：${sub.textContent}`); }
    st.innerHTML=done.map(t=>`<div>${esc(t)}</div>`).join('');
  }catch(err){ st.innerHTML='<span style="color:#b3261e;font-weight:700">⚠ エラー</span> '+esc(err.message); }
}
if($('#ptImport')) $('#ptImport').onclick=()=>importPortalTalk();
// 拡張機能（カイポケ記録同期）の「ポータルのトークを取り込む」「すべてまとめて」から ?auto=ptalk で裏で開かれたとき：取り込んで、結果をタブの題名で知らせる
(function(){ if(!/[?&]auto=ptalk(&|$)/.test(location.search)) return; let n=0; const t=setInterval(async()=>{ n++;
  if(n>90){ clearInterval(t); document.title='PTALK_ERR アロハハウスアプリの読み込みが終わりませんでした'; return; }
  if(!(typeof D!=='undefined'&&D.residents&&D.residents.length)) return; clearInterval(t);
  try{ if(!portalKey()) throw new Error('ポータルの合言葉がありません（一度ポータルからアロハハウスアプリを開いてください）'); await importPortalTalk(); const st=(($('#ptStatus')||{}).textContent||'').replace(/\s+/g,' ').trim(); document.title=(/エラー|⚠/.test(st)?'PTALK_ERR ':'PTALK_DONE ')+st.slice(0,300); }
  catch(e){ document.title='PTALK_ERR '+(e.message||e); } },1000); })();
if($('#impLine')) $('#impLine').onchange=async e=>{ const f=e.target.files[0]; if(f) await importLineFile(f,$('#extStatus'),$('#extYM').value); e.target.value=''; };
$('#impLine2').onchange=async e=>{ const files=[...e.target.files]; const st=$('#lineStatus'); const results=[];
  // 複数ファイルは順番に処理（全体グループ／ご家族グループの区別は、覚えている対応で自動判定）
  for(let i=0;i<files.length;i++){ const f=files[i]; const pre=files.length>1?`【${i+1}/${files.length}：${f.name}】`:''; if(pre) toast(pre+'を取り込み中'); await importLineFile(f,st,$('#lineYM').value,{useSel:files.length===1}); results.push((pre?'<b>'+esc(pre)+'</b>':'')+st.innerHTML); }
  if(files.length>1) st.innerHTML=results.join('<br>');
  e.target.value=''; if($('#lineRedo')) $('#lineRedo').checked=false; };
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
$('#resSave').onclick=async()=>{ const list=editRes.filter(r=>r['氏名'].trim()); try{ busy(true); const saved=await api('saveResidents',{residents:list}); D.allResidents=saved; D._act=saved.filter(r=>r['在籍']!=='0'); resFilter(); renderResTable(); toast('保存しました'); renderToday(); }catch(e){toast('失敗: '+e.message);} finally{busy(false);} };
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
    if(added||editRes.some(r=>r['ふりがな'])){ const saved=await api('saveResidents',{residents:editRes.filter(r=>r['氏名'].trim())}); D.allResidents=saved; D._act=saved.filter(r=>r['在籍']!=='0'); resFilter(); editRes=saved.map(r=>({...r})); renderResTable(); renderToday(); }
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

if($('#ocBtn')) $('#ocBtn').onclick=openOC; if($('#ocCsvBtn')) $('#ocCsvBtn').onclick=ocCsvDownload;
// 新しい版が出たら知らせる（開きっぱなしの端末が古い画面のまま動かないように）2026/11/22
(function(){ const mine=((document.querySelector('script[src*="app.js?v="]')||{}).src||'').split('v=')[1]||'';
  const check=async()=>{ try{ const t=await (await fetch('index.html?x='+Date.now(),{cache:'no-store'})).text(); const m=t.match(/app\.js\?v=([\w]+)/); if(!m||!mine||m[1]===mine||document.getElementById('newVer')) return;
    const d=document.createElement('div'); d.id='newVer'; d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:9999;background:#c0392b;color:#fff;font-weight:700;font-size:17px;padding:12px 16px;text-align:center;cursor:pointer';
    d.textContent='新しい版があります。ここを押して読み込み直してください（書きかけの内容は先に保存してください）'; d.onclick=()=>{ /* 端末やブラウザに残った古い画面を使わないよう、URLを少し変えて読み直す（押しても赤い帯が消えなかった 2026/11/25） */ try{ navigator.serviceWorker&&navigator.serviceWorker.getRegistration().then(r=>r&&r.update()); }catch(e){} const u=new URL(location.href); u.searchParams.set('_r',String(Date.now())); location.replace(u.toString()); }; document.body.appendChild(d); }catch(e){} };
  setTimeout(check,20000); setInterval(check,5*60e3); document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') check(); }); })();
