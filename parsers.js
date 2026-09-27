// カイポケ帳票パーサー（訪看スケジュール表PDF・訪介シフトCSV・サービス提供票PDF）
// ===== 共通 =====
function normName(s){
  if(!s) return '';
  return s.replace(/様$/,'').replace(/[\s　]+/g,'').replace(/髙/g,'高').replace(/﨑/g,'崎').replace(/邊|邉/g,'辺');
}
function dispName(s){ return (s||'').replace(/様$/,'').replace(/[\s　]+/g,' ').trim(); }
function warekiToYear(era, y){
  y = parseInt(y,10);
  if(era==='令和') return 2018+y;
  if(era==='平成') return 1988+y;
  return y;
}
function zen2han(s){ return s.replace(/[０-９]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)); }

// pdf.js のページから、位置付きテキスト要素の配列を得る
async function pageItems(page){
  const tc = await page.getTextContent();
  return tc.items.filter(i=>i.str && i.str.trim()).map(i=>({
    s:i.str, x:i.transform[4], y:i.transform[5], w:i.width, h:i.height||0
  }));
}
function groupLines(items, tol){
  tol = tol||3;
  const sorted = items.slice().sort((a,b)=>b.y-a.y||a.x-b.x);
  const lines=[];
  for(const it of sorted){
    const L = lines[lines.length-1];
    if(L && Math.abs(L.y-it.y)<=tol){ L.items.push(it); }
    else lines.push({y:it.y, items:[it]});
  }
  for(const L of lines) L.items.sort((a,b)=>a.x-b.x);
  return lines;
}

// ===== 1. 訪問看護 職員別スケジュール表(予定) PDF =====
// 戻り値: {staff:[{name,period}], rows:[{date:'YYYY-MM-DD', start,end,min,user,service,note,staff}]}
async function parseNursePdf(pdfDoc){
  const rows=[]; const staffSet=new Map();
  let curStaff=null, baseYear=null, startMonth=null;
  for(let p=1;p<=pdfDoc.numPages;p++){
    const page = await pdfDoc.getPage(p);
    const items = await pageItems(page);
    const lines = groupLines(items, 3);
    // ヘッダ
    let colX=null;
    for(const L of lines){
      const txt = L.items.map(i=>i.s).join('');
      let m;
      if((m=txt.match(/職員名[：:]\s*(.+)$/))){ curStaff = dispName(m[1]); }
      if((m=txt.match(/対象期間[：:]\s*(令和|平成)(\d+)年(\d+)月(\d+)日/))){
        baseYear = warekiToYear(m[1],m[2]); startMonth=parseInt(m[3],10);
        if(curStaff) staffSet.set(curStaff, txt.replace(/^.*対象期間[：:]/,''));
      }
      if(txt.includes('ご利用者名') && txt.includes('サービス内容')){
        colX={};
        for(const i of L.items){
          if(i.s.includes('日付')) colX.date=i.x;
          if(i.s.includes('分')&&i.s.length<=2) colX.min=i.x;
          if(i.s.includes('ご利用者名')) colX.user=i.x;
          if(i.s.includes('サービス内容')) colX.service=i.x;
          if(i.s.includes('備考')) colX.note=i.x;
        }
      }
    }
    if(!colX||!baseYear) continue;
    // 列境界（ヘッダ文字の左端より少し左）
    const bUser = colX.user-30, bService = colX.service-25, bNote = colX.note-65;
    const bMin = colX.min-15;
    // 本文行: 日付で始まる行をレコードにする（日付・時間・分は同一行）
    const recs=[];
    const dateRe=/^(\d{1,2})月(\d{1,2})日/;
    const body=lines.filter(L=>L.y>=40 && L.y<=700);
    for(const L of body){
      const first=L.items[0];
      if(first.x<60 && dateRe.test(first.s)){
        const m=first.s.match(dateRe);
        const rec={y:L.y, month:+m[1], day:+m[2], start:'',end:'',min:'',user:'',service:'',note:''};
        for(const i of L.items.slice(1)){
          if(i.x<bMin){ const t=i.s.match(/(\d{1,2}:\d{2})\s*[～~\-]\s*(\d{1,2}:\d{2})/); if(t){rec.start=t[1];rec.end=t[2];} }
          else if(i.x<bUser){ rec.min+=i.s; }
        }
        recs.push(rec);
      }
    }
    if(!recs.length) continue;
    // 折返しのある列（利用者名・サービス内容・備考）は、列ごとに縦方向のかたまり（ブロック）を作り、
    // ブロック中心に最も近いレコードへ割り当てる
    const cols=[{key:'user',lo:bUser,hi:bService},{key:'service',lo:bService,hi:bNote},{key:'note',lo:bNote,hi:1e9}];
    for(const c of cols){
      const its=[]; for(const L of body) for(const i of L.items) if(i.x>=c.lo && i.x<c.hi) its.push(i);
      its.sort((a,b)=>b.y-a.y||a.x-b.x);
      let blocks=[];
      for(const i of its){
        const B=blocks[blocks.length-1];
        if(B && B.lastY-i.y<=13){ B.items.push(i); if(i.y<B.lastY) B.lastY=i.y; }
        else blocks.push({items:[i], topY:i.y, lastY:i.y});
      }
      // 2レコードにまたがるブロックは、レコード境界の中点で分割
      const out=[];
      for(const B of blocks){
        const inside=recs.filter(r=>r.y<=B.topY+4 && r.y>=B.lastY-4);
        if(inside.length<=1){ out.push(B); continue; }
        inside.sort((a,b)=>b.y-a.y);
        // 行ごとにまとめ、各レコード中心に最も近くなる分割位置を選ぶ
        const lns=[]; for(const i of B.items){ const L=lns[lns.length-1]; if(L&&Math.abs(L.y-i.y)<=3) L.items.push(i); else lns.push({y:i.y,items:[i]}); }
        let rest=lns;
        for(let k=0;k<inside.length-1;k++){
          let bestS=1,bestSc=1e9;
          for(let s=1;s<rest.length;s++){
            const a=rest.slice(0,s), b=rest.slice(s);
            const ca=(a[0].y+a[a.length-1].y)/2, cb=(b[0].y+b[b.length-1].y)/2;
            const sc=Math.abs(ca-inside[k].y)+Math.abs(cb-inside[k+1].y);
            if(sc<bestSc){bestSc=sc;bestS=s;}
          }
          out.push({items:rest.slice(0,bestS).flatMap(l=>l.items)}); rest=rest.slice(bestS);
        }
        out.push({items:rest.flatMap(l=>l.items)});
      }
      for(const B of out){
        if(!B.items.length) continue;
        const ys=B.items.map(i=>i.y); const cy=(Math.max(...ys)+Math.min(...ys))/2;
        let best=null,bd=99; for(const r of recs){ const d=Math.abs(r.y-cy); if(d<bd){bd=d;best=r;} }
        if(best && bd<=16) best[c.key]+=B.items.map(i=>i.s).join('');
      }
    }
    for(const r of recs){
      let y=baseYear; if(startMonth && r.month<startMonth) y=baseYear+1;
      const date=`${y}-${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`;
      rows.push({date, start:r.start, end:r.end, min:parseInt(r.min,10)||0,
        user:dispName(r.user), service:r.service.trim(), note:r.note.trim(), staff:curStaff});
    }
  }
  return {staff:[...staffSet].map(([name,period])=>({name,period})), rows};
}

// ===== 2. 訪問介護 シフトCSV =====
// 列: ヘルパー名,日付,曜日,利用者,業務種別,サービス内容,開始時間,終了時間,提供時間（分）,備考
function parseCsvText(text){
  const out=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(cur);cur=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(cur); out.push(row); row=[];cur=''; }
    else cur+=c;
  }
  if(cur||row.length){ row.push(cur); out.push(row); }
  return out.filter(r=>r.length>1 || (r[0]&&r[0].trim()));
}
function parseHelperCsv(text, year, month){
  const table=parseCsvText(text.replace(/^﻿/,''));
  const head=table[0].map(s=>s.trim());
  const idx=n=>head.findIndex(h=>h.includes(n));
  const iH=idx('ヘルパー'), iD=idx('日付'), iU=idx('利用者'), iK=idx('業務種別'), iS=idx('サービス内容'), iSt=idx('開始'), iEn=idx('終了'), iM=idx('提供時間'), iN=idx('備考');
  const rows=[]; const helpers=new Set();
  for(const r of table.slice(1)){
    const d=parseInt(zen2han(r[iD]||''),10); if(!d) continue;
    const helper=dispName(r[iH]); helpers.add(helper);
    rows.push({date:`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      start:(r[iSt]||'').trim(), end:(r[iEn]||'').trim(), min:parseInt((r[iM]||'').replace(/[^\d]/g,''),10)||0,
      user:dispName(r[iU]), kind:(r[iK]||'').trim(), service:(r[iS]||'').trim(), note:(r[iN]||'').trim(), staff:helper});
  }
  return {helpers:[...helpers], rows};
}

// ===== 3. デイサービス サービス提供票 PDF =====
// 戻り値 rows:[{date, start,end, user, service, office}]
async function parseDayPdf(pdfDoc){
  const rows=[]; const users=new Set();
  for(let p=1;p<=pdfDoc.numPages;p++){
    const page=await pdfDoc.getPage(p);
    const items=await pageItems(page);
    const all=items.map(i=>i.s).join('');
    if(all.includes('提供票別表')) continue;
    if(!all.includes('サービス提供票')) continue;
    const m=all.match(/(令和|平成)(\d+)年(\d+)月\s*分/); if(!m) continue;
    const year=warekiToYear(m[1],m[2]), month=parseInt(m[3],10);
    // 利用者名: 「被保険者氏名」と同じ高さで右側の要素
    const lab=items.find(i=>i.s.includes('被保険者氏名'));
    let user='';
    if(lab){ const c=items.filter(i=>Math.abs(i.y-lab.y)<8 && i.x>lab.x+50 && i.s!=='様').sort((a,b)=>a.x-b.x); if(c.length) user=dispName(c[0].s); }
    // 日付列: 「曜日」行の各曜日文字の中心x
    const youbi=items.find(i=>i.s==='曜日'); if(!youbi) continue;
    const dayCols=items.filter(i=>Math.abs(i.y-youbi.y)<4 && i.x>youbi.x+10 && /^[月火水木金土日]$/.test(i.s)).sort((a,b)=>a.x-b.x).map((i,k)=>({d:k+1, cx:i.x+i.w/2}));
    if(dayCols.length<28) continue;
    const gridL=dayCols[0].cx-7;
    const hdr=items.find(i=>i.s==='提供時間帯'); const svc=items.find(i=>i.s==='サービス内容'&&i.y>youbi.y); const off=items.find(i=>i.s==='事業者');
    const xTime=hdr?hdr.x:0, xSvc=svc?svc.x:90, xOff=off?off.x:196, xPlan=youbi.x;
    const plans=items.filter(i=>i.s==='予定');
    for(const pl of plans){
      const near=items.filter(i=>i.y<=pl.y+9 && i.y>=pl.y-22 && i.x<xPlan-5); // 予定行と実績行のあいだ
      let time='',service='',office='';
      for(const i of near.sort((a,b)=>b.y-a.y||a.x-b.x)){
        if(i.x<xSvc-5) time+=i.s; else if(i.x<xOff-5) service+=i.s; else office+=i.s;
      }
      service=service.trim(); if(!service) continue;
      if(/加算/.test(service)) continue;
      const marks=items.filter(i=>Math.abs(i.y-pl.y)<4 && i.x>gridL && i.x<dayCols[dayCols.length-1].cx+7);
      const days=new Set();
      for(const mk of marks){
        const toks=mk.s.trim().split(/\s+/); const n=toks.length;
        toks.forEach((t,k)=>{
          if(!/^\d+$/.test(t)) return;
          const cx = n===1 ? mk.x+mk.w/2 : mk.x + mk.w*(k+0.5)/n;
          let best=null,bd=99; for(const dc of dayCols){ const d=Math.abs(dc.cx-cx); if(d<bd){bd=d;best=dc;} }
          if(best && bd<8) days.add(best.d);
        });
      }
      const t=zen2han(time).match(/(\d{1,2}:\d{2})\s*[～~\-]\s*(\d{1,2}:\d{2})/);
      for(const d of [...days].sort((a,b)=>a-b)){
        rows.push({date:`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
          start:t?t[1]:'', end:t?t[2]:'', user, service, office:office.trim()});
      }
    }
    if(user) users.add(user);
  }
  return {users:[...users], rows};
}


// ===== 4. カイポケ 簡易版アセスメントシート PDF =====
// 戻り値: {name, kana, sex, birth:'YYYY-MM-DD', age, room, tel, family:[{name,rel,age,live,note,tel,addr,emergency}],
//          care:{level, certDate, from, to, insuredNo, medical}, services:[{kind,office}], diseases:[{type,name,hospital,doctor,dept,tel,status}],
//          meds:'', special:'', life:'', current:''}
function warekiDate(s){ const m=String(s||'').match(/(令和|平成|昭和|大正)\s*(\d+)年\s*(\d+)月\s*(\d+)日/); if(!m) return ''; const base={'令和':2018,'平成':1988,'昭和':1925,'大正':1911}[m[1]]; return `${base+parseInt(m[2],10)}-${String(+m[3]).padStart(2,'0')}-${String(+m[4]).padStart(2,'0')}`; }
async function parseAssessmentPdf(pdfDoc){
  const out={name:'',kana:'',sex:'',birth:'',age:'',room:'',tel:'',family:[],care:{},services:[],diseases:[],meds:'',special:'',life:'',current:''};
  const pages=[];
  for(let p=1;p<=pdfDoc.numPages;p++){ const page=await pdfDoc.getPage(p); pages.push(await pageItems(page)); }
  const all=pages.flat(); const txt=all.map(i=>i.s).join(' ');
  const find=(items,re)=>items.find(i=>re.test(i.s));
  const lineOf=(items,y,tol)=>items.filter(i=>Math.abs(i.y-y)<=(tol||3)).sort((a,b)=>a.x-b.x);
  // --- 基本 ---
  const p1=pages[0]||[];
  const kana=find(p1,/^フリガナ$/); if(kana){ out.kana=lineOf(p1,kana.y).filter(i=>i.x>kana.x+20).map(i=>i.s).join(' ').trim(); }
  const bd=find(p1,/生年月日/); if(bd){ const L=lineOf(p1,bd.y); const v=L.filter(i=>i.x>bd.x+20).map(i=>i.s).join(' '); out.birth=warekiDate(v); const a=v.match(/(\d+)\s*才/); if(a) out.age=a[1]; const sx=L.find(i=>/^[男女]$/.test(i.s)); if(sx) out.sex=sx.s; }
  const nm=find(p1,/^利用者氏名$/); if(nm){ const cand=p1.filter(i=>i.x>nm.x+40&&i.x<300&&i.y<nm.y+12&&i.y>nm.y-14&&!/生年月日|男|女/.test(i.s)); out.name=cand.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' ').trim(); }
  const rm=txt.match(/アロハハウス\s*(\d{3})\s*号/); if(rm) out.room=rm[1];
  const tl=find(p1,/^電話番号$/); if(tl&&tl.x<80){ const v=lineOf(p1,tl.y).find(i=>i.x>tl.x+20&&/\d{2,4}-?\d{2,4}-?\d{3,4}/.test(i.s)); if(v) out.tel=v.s.trim(); }
  // --- 家族構成 / 緊急連絡先 ---
  const heads=p1.filter(i=>i.s==='続柄').map(i=>i.y).sort((a,b)=>b-a); // 上が家族、下が緊急連絡先
  const famHead=heads[0], emHead=heads[1];
  const stopY=(find(p1,/これまでの職業/)||{y:0}).y;
  const rowsBetween=(top,bottom)=>{ const its=p1.filter(i=>i.y<top-4&&i.y>bottom+4&&i.x>=95); const lines=groupLines(its,4); return lines; };
  const cols=(L,xs)=>{ const o=xs.map(()=>[]); for(const it of L.items){ let k=0; for(let j=0;j<xs.length;j++){ if(it.x>=xs[j]-6) k=j; } o[k].push(it.s); } return o.map(a=>a.join(' ').trim()); };
  const mergeRows=(lines,xs)=>{ const rows=lines.map(L=>({y:L.y,c:cols(L,xs)})); const anchors=rows.filter(r=>r.c[0]); for(const r of rows){ if(r.c[0]) continue; let best=null; for(const a of anchors){ if(!best||Math.abs(a.y-r.y)<Math.abs(best.y-r.y)) best=a; } if(!best||Math.abs(best.y-r.y)>16) continue; r.c.forEach((v,k)=>{ if(!v) return; best.c[k]=r.y>best.y?(v+best.c[k]):(best.c[k]+v); }); } return anchors.map(a=>a.c); };
  if(famHead){
    for(const [name,rel,age,live,note] of mergeRows(rowsBetween(famHead, emHead||stopY),[95,222,258,310,430])){ if(!name) continue; out.family.push({name:name.replace(/\s+/g,' '),rel,age:age.replace(/[^\d]/g,''),live,note,tel:'',addr:'',emergency:false}); }
  }
  if(emHead){
    for(const [name,rel,addr,tel] of mergeRows(rowsBetween(emHead, stopY),[95,222,258,460])){ if(!name) continue;
      const key=name.replace(/[\s　]/g,''); const f=out.family.find(x=>x.name.replace(/[\s　]/g,'')===key);
      if(f){ f.tel=tel; f.addr=addr; f.emergency=true; if(!f.rel) f.rel=rel; } else out.family.push({name,rel,age:'',live:'',note:'',tel,addr,emergency:true}); }
  }
  // --- 認定情報 ---
  const lv=txt.match(/(要介護\s*[１-５1-5]|要支援\s*[１-２1-2]|事業対象者)/); if(lv) out.care.level=zen2han(lv[1].replace(/\s/g,''));
  const cd=txt.match(/認定年月日\s*((?:令和|平成)\s*\d+年\s*\d+月\s*\d+日)/); if(cd) out.care.certDate=warekiDate(cd[1]);
  const pr=txt.match(/認定期間\s*((?:令和|平成)\s*\d+年\s*\d+月\s*\d+日)\s*[〜～]\s*((?:令和|平成)\s*\d+年\s*\d+月\s*\d+日)/); if(pr){ out.care.from=warekiDate(pr[1]); out.care.to=warekiDate(pr[2]); }
  const ins=txt.match(/被保険者番号\s*(\d{8,12})/); if(ins) out.care.insuredNo=ins[1];
  const md=all.find(i=>i.s==='医療保険'); if(md){ const L=lineOf(pages.find(pg=>pg.includes(md)),md.y); const v=L.find(i=>i.x>md.x+30); if(v) out.care.medical=v.s.trim(); }
  const jr=txt.match(/障害高齢者の\s*日常生活自立度\s*([ＪJＡAＢBＣC][１-２1-2]?)/); // 位置依存なので簡易
  // --- 利用サービス ---
  const KINDS=/^(居宅介護支援|訪問介護|訪問看護|訪問入浴|訪問リハ|通所介護|通所リハ|地域密着型通所介護|福祉用具貸与|特定福祉用具|短期入所|居宅療養管理|小規模多機能|定期巡回|夜間対応|認知症対応型|介護予防[^\s]*)/;
  for(const pg of pages){ const h=pg.find(i=>i.s==='サービス種別'); if(!h) continue; const end=(pg.filter(i=>i.y<h.y-4&&/課題分析|利用者の|望む生活|家族の/.test(i.s)).sort((a,b)=>b.y-a.y)[0]||{y:h.y-80}).y;
    const its=pg.filter(i=>i.y<h.y-4&&i.y>end&&i.x>=95); const lines=groupLines(its,4); const ents=[]; const orphans=[];
    for(const L of lines){ for(const side of ['L','R']){ const part=L.items.filter(i=>side==='L'?i.x<310:i.x>=310); if(!part.length) continue; const k=part.find(i=>KINDS.test(i.s));
      if(k) ents.push({kind:k.s,office:part.filter(i=>i!==k).map(i=>i.s).join(''),side,y:L.y}); else orphans.push({side,y:L.y,t:part.map(i=>i.s).join('')}); } }
    for(const o of orphans){ let best=null; for(const e of ents){ if(e.side!==o.side) continue; if(!best||Math.abs(e.y-o.y)<Math.abs(best.y-o.y)) best=e; } if(best&&Math.abs(best.y-o.y)<=14){ best.office=o.y>best.y?o.t+best.office:best.office+o.t; } }
    out.services.push(...ents);
  }
  out.services.forEach(s=>{ delete s.side; delete s.y; s.office=s.office.replace(/\s+/g,''); });
  // --- 既往/現病 ---
  for(const pg of pages){ const h=pg.find(i=>i.s==='既往/現病'); if(!h) continue; const H=lineOf(pg,h.y); const xs=['傷病名','病院名','医師名','診療科目','電話番号','受診状況'].map(k=>(H.find(i=>i.s===k)||{}).x||0);
    const end=(pg.find(i=>i.s==='傷病名'&&i.y<h.y-20)||{y:h.y-150}).y;
    const region=pg.filter(i=>i.y<h.y-4&&i.y>end+4&&i.x>=95); const labels=region.filter(i=>/^(既往|現病)$/.test(i.s)&&i.x<130);
    const recs=labels.map(l=>({type:l.s,y:l.y,name:[],hospital:[],doctor:[],dept:[],tel:[],status:[]}));
    for(const it of region.sort((a,b)=>b.y-a.y||a.x-b.x)){ if(labels.includes(it)) continue; if(!recs.length) break; let best=recs[0]; for(const r of recs){ if(Math.abs(r.y-it.y)<Math.abs(best.y-it.y)) best=r; }
      const mid=(a,b)=>(xs[a]+xs[b])/2; const k=it.x<mid(0,1)?'name':it.x<mid(1,2)?'hospital':it.x<mid(2,3)?'doctor':it.x<mid(3,4)?'dept':it.x<mid(4,5)?'tel':'status'; best[k].push(it.s); }
    out.diseases=recs.map(r=>({type:r.type,name:r.name.join(''),hospital:r.hospital.join(''),doctor:r.doctor.join(' '),dept:r.dept.join(''),tel:r.tel.join(''),status:r.status.join('')}));
    // 特記事項・服薬内容（近い見出しに寄せる）
    const sp=pg.find(i=>i.s==='【特記事項】'), me=pg.find(i=>i.s==='服薬内容');
    if(sp){ const bottom=me?me.y-14:sp.y-200; const its=pg.filter(i=>i.y<sp.y-2&&i.y>bottom&&i.x>=95&&i.s!=='服薬内容'); const lines=groupLines(its,4); const a=[],b=[];
      for(const L of lines){ const t=L.items.map(i=>i.s).join(''); if(me&&Math.abs(L.y-me.y)<Math.abs(L.y-sp.y)) b.push(t); else a.push(t); } out.special=a.join('\n'); out.meds=b.join('\n'); }
  }
  // --- 生活歴・現在の生活状況（1ページ目）---
  const lh=find(p1,/これまでの職業/), cur=find(p1,/生活・介護の状況など/), fin=find(p1,/障害高齢者の/);
  if(lh&&cur){ out.life=groupLines(p1.filter(i=>i.y<lh.y-2&&i.y>cur.y+2&&i.x>=95&&i.x<420),4).map(L=>L.items.map(i=>i.s).join('')).join(''); }
  if(cur&&fin){ out.current=groupLines(p1.filter(i=>i.y<cur.y-2&&i.y>fin.y+6&&i.x>=95),4).map(L=>L.items.map(i=>i.s).join('')).join(''); }
  return out;
}

