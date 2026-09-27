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

