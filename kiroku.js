// ===== カイポケ介護記録PDF（カイポケタブレット(通)「まとめて印刷」）パーサー =====
// 報告書メーカー（houkoku-maker）で使っている解析ロジックと同じ方式：罫線からセルを復元して行を組み立てる
function norm(s){ return (s||"").normalize("NFKC").replace(/[ 　]/g,""); }
function nfkc(s){ return (s||"").normalize("NFKC"); }
const RE_HM = /^\d{1,2}[:：]\d{2}$/;
const RE_YM = /(?:令和|R)?\s*(\d{1,4})\s*年\s*(\d{1,2})\s*月/;
const RE_MD = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/;
function toYear(y){ return y<1000 ? y+2018 : y; }

function kGroupLines(items){
  const arr = items.filter(i=>i.str && i.str.trim() !== "").map(i=>({ str:i.str, x:i.transform[4], y:i.transform[5], w:i.width||0, h:Math.abs(i.transform[3])||10 }));
  arr.sort((a,b)=> (b.y - a.y) || (a.x - b.x));
  const lines = [];
  for (const it of arr){
    const last = lines[lines.length-1];
    const tol = Math.max(2.5, it.h*0.5);
    if (last && Math.abs(last.y - it.y) <= tol){ last.items.push(it); } else lines.push({ y:it.y, items:[it] });
  }
  lines.forEach(l=>l.items.sort((a,b)=>a.x-b.x));
  return lines;
}
function kRunsOf(line){
  const out=[]; let cur=null;
  for (const it of line.items){
    const gap = it.h*0.32;
    if (cur && it.x - (cur.x + cur.w) < gap){ cur.str += it.str; cur.w = (it.x + it.w) - cur.x; }
    else { cur = { str:it.str, x:it.x, w:it.w }; out.push(cur); }
  }
  return out.map(r=>({ str:r.str.trim(), x:r.x, w:r.w })).filter(r=>r.str!=="");
}
function kLineText(line){ return line.items.map(i=>i.str).join(""); }

// --- 罫線抽出 ---
function mtx(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function mpt(m,x,y){return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];}
async function pageRules(page){
  const OPS = pdfjsLib.OPS;
  const ol = await page.getOperatorList();
  let ctm=[1,0,0,1,0,0]; const stack=[]; const H=[], V=[];
  const seg=(p1,p2)=>{
    if (Math.abs(p1[1]-p2[1])<0.8 && Math.abs(p1[0]-p2[0])>2) H.push({y:(p1[1]+p2[1])/2,x1:Math.min(p1[0],p2[0]),x2:Math.max(p1[0],p2[0])});
    else if (Math.abs(p1[0]-p2[0])<0.8 && Math.abs(p1[1]-p2[1])>2) V.push({x:(p1[0]+p2[0])/2,y1:Math.min(p1[1],p2[1]),y2:Math.max(p1[1],p2[1])});
  };
  for (let i=0;i<ol.fnArray.length;i++){
    const fn=ol.fnArray[i], args=ol.argsArray[i];
    if (fn===OPS.save) stack.push(ctm.slice());
    else if (fn===OPS.restore) ctm = stack.pop() || [1,0,0,1,0,0];
    else if (fn===OPS.transform) ctm = mtx(ctm,args);
    else if (fn===OPS.constructPath){
      const ops=args[0], co=args[1]; let j=0, cx=0, cy=0, sx=0, sy=0;
      for (const op of ops){
        if (op===OPS.moveTo){ cx=co[j]; cy=co[j+1]; sx=cx; sy=cy; j+=2; }
        else if (op===OPS.lineTo){ const nx=co[j], ny=co[j+1]; j+=2; seg(mpt(ctm,cx,cy), mpt(ctm,nx,ny)); cx=nx; cy=ny; }
        else if (op===OPS.curveTo){ j+=6; cx=co[j-2]; cy=co[j-1]; }
        else if (op===OPS.closePath){ seg(mpt(ctm,cx,cy), mpt(ctm,sx,sy)); cx=sx; cy=sy; }
        else if (op===OPS.rectangle){
          const x=co[j], y=co[j+1], w=co[j+2], h=co[j+3]; j+=4;
          const a=mpt(ctm,x,y), b=mpt(ctm,x+w,y+h);
          const x1=Math.min(a[0],b[0]), x2=Math.max(a[0],b[0]), y1=Math.min(a[1],b[1]), y2=Math.max(a[1],b[1]);
          if (x2-x1 < 0.8 && y2-y1 > 2) V.push({x:(x1+x2)/2,y1,y2});
          else if (y2-y1 < 0.8 && x2-x1 > 2) H.push({y:(y1+y2)/2,x1,x2});
          else if (x2-x1 > 2 && y2-y1 > 2){ H.push({y:y1,x1,x2}); H.push({y:y2,x1,x2}); V.push({x:x1,y1,y2}); V.push({x:x2,y1,y2}); }
        }
        else { j+=2; }
      }
    }
  }
  return { H, V };
}
function buildGrid(H, V, crossY){
  const vlong = V.filter(l=>l.y2-l.y1 >= 20 && (crossY==null || (l.y1 <= crossY && l.y2 >= crossY)));
  if (vlong.length < 2) return null;
  const xs = [];
  vlong.map(l=>l.x).sort((a,b)=>a-b).forEach(x=>{ const last = xs[xs.length-1]; if (last !== undefined && x - last <= 2) return; xs.push(x); });
  const cols = [];
  for (let c=0;c<xs.length-1;c++){
    const x1 = xs[c], x2 = xs[c+1];
    if (x2 - x1 < 6) continue;
    const m1 = x1 + (x2-x1)*0.25, m2 = x1 + (x2-x1)*0.75;
    const ys = [];
    H.filter(l=>l.x1 <= m1+1 && l.x2 >= m2-1).map(l=>l.y).sort((a,b)=>b-a).forEach(y=>{ const last = ys[ys.length-1]; if (last !== undefined && last - y <= 1.5) return; ys.push(y); });
    if (ys.length >= 2) cols.push({ x1, x2, ys });
  }
  return cols.length ? cols : null;
}
function cellRange(col, y){
  for (let i=0;i<col.ys.length-1;i++){ if (y <= col.ys[i] + 0.5 && y > col.ys[i+1] - 0.5) return { top:col.ys[i], bottom:col.ys[i+1] }; }
  return null;
}
function cleanStaff(x){ return String(x||"").replace(/[（(].*?[)）]/g,"").replace(/[\s　]+/g,"").replace(/様$/,"").trim(); }

// --- 業務日誌ページ ---
function parseNippouPage(lines, users, diag){
  const all = lines.map(kLineText).join("\n");
  const md = all.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!md) return false;
  const dateStr = md[1]+"年"+md[2]+"月"+md[3]+"日", day = +md[3];
  const flat = norm(all);
  if (flat.indexOf("記録種別") >= 0) return false;
  if (flat.indexOf("業務日誌") < 0 && !(flat.indexOf("利用者名")>=0 && flat.indexOf("欠席者名")>=0)) return false;
  diag.nippouPages++;
  const hi = lines.findIndex(l=>{ const t = norm(kLineText(l)); return t.indexOf("利用者名")>=0 && t.indexOf("開始")>=0 && t.indexOf("終了")>=0; });
  if (hi >= 0){
    const cols = kRunsOf(lines[hi]).map(r=>r.str).slice(3);
    for (let li=hi+1; li<lines.length; li++){
      const t = norm(kLineText(lines[li]));
      if (t.indexOf("利用者計")>=0 || t.indexOf("欠席者名")>=0 || t.indexOf("特記")===0) break;
      const runs = kRunsOf(lines[li]);
      const ti = runs.findIndex(r=>RE_HM.test(r.str));
      if (ti < 1) continue;
      const before = runs.slice(0,ti).map(r=>r.str);
      let name = "";
      for (let i=before.length-1;i>=0;i--){ if (/様$/.test(before[i])){ name = before[i]; break; } }
      if (!name) name = before[before.length-1] || "";
      name = name.replace(/様$/,"").trim();
      if (!name) continue;
      const start = runs[ti].str.replace("：",":");
      const end   = (runs[ti+1] && RE_HM.test(runs[ti+1].str)) ? runs[ti+1].str.replace("：",":") : "";
      const vals  = runs.slice(ti+2).map(r=>r.str);
      const key = norm(name);
      if (!users[key]) users[key] = { name, records:[] };
      const parts = [];
      for (let i=0;i<cols.length && i<vals.length;i++){ if (vals[i] && vals[i] !== "-") parts.push(cols[i]+"："+vals[i]); }
      users[key].records.push({ date:dateStr, day, kind:"利用", time:(start&&end)?start+"〜"+end:"", content:parts.join("　") });
      diag.attRows++;
    }
  }
  const si = lines.findIndex(l=>norm(kLineText(l)).indexOf("特記")===0);
  if (si >= 0){
    let cur = null, curName = "";
    for (let li=si; li<lines.length; li++){
      const raw = kLineText(lines[li]).replace(/^特記/,"").trim();
      if (!raw) continue;
      const mm = raw.match(/^【(.+?)】$/);
      if (mm){ curName = mm[1].replace(/様$/,"").trim(); cur = norm(curName); continue; }
      if (!cur) continue;
      if (!users[cur]) users[cur] = { name:curName, records:[] };
      const rec = raw.match(/[（(]([^（）()]{2,12})[)）]\s*$/);
      const who = rec ? cleanStaff(rec[1]) : "";
      users[cur].records.push({ date:dateStr, day, kind:"特記", time:"", content:raw, recorder:who });
      diag.noteRows++;
    }
  }
  return true;
}

// --- 介護記録ページ（罫線ベース） ---
const KIROKU_COLS = ["日付","記録種別","時間","内容","記録者"];
function parseKirokuGrid(cols, its){
  const colIndex = (x)=>{ for (let i=0;i<cols.length;i++){ if (x>=cols[i].x1-1 && x<cols[i].x2+1) return i; } return -1; };
  const find = (label)=> its.find(t=>norm(t.str)===label);
  const h = {};
  for (const L of KIROKU_COLS){ const t = find(L); if (t) h[L] = colIndex(t.x + t.w/2); }
  if (h["日付"]==null || h["記録種別"]==null || h["内容"]==null) return null;
  const hy = find("記録種別").y;
  const body = its.filter(t=>t.y < hy - 2);
  const cContent = cols[h["内容"]];
  const bounds = cContent.ys.filter(y=>y < hy);
  const rows = [];
  for (let i=0;i<bounds.length-1;i++) rows.push({ top:bounds[i], bottom:bounds[i+1], cells:{} });
  if (!rows.length) return null;
  const put = (row,key,txt)=>{ row.cells[key] = (row.cells[key]||"") + txt; };
  for (const t of body){
    const ci = colIndex(t.x + t.w/2);
    if (ci < 0) continue;
    let key = null;
    for (const L of KIROKU_COLS) if (h[L] === ci) key = L;
    if (!key) continue;
    if (key === "内容"){ const r = rows.find(r=>t.y <= r.top+0.5 && t.y > r.bottom-0.5); if (r) put(r,"内容", t.str + " "); }
    else { const cr = cellRange(cols[ci], t.y); if (!cr) continue; for (const r of rows){ if (r.top <= cr.top+0.5 && r.bottom >= cr.bottom-0.5) put(r,key,t.str); } }
  }
  return rows.map(r=>({ date: norm(r.cells["日付"]||""), kind: (r.cells["記録種別"]||"").trim(), time: (r.cells["時間"]||"").trim(), content: (r.cells["内容"]||"").trim(), recorder: (r.cells["記録者"]||"").trim() })).filter(r=>r.kind || r.content);
}
function fillDates(records){
  for (let i=0;i<records.length;i++){
    if (records[i].date) continue;
    let j = i; while (j < records.length && !records[j].date) j++;
    const prev = i > 0 ? records[i-1].date : "";
    const next = j < records.length ? records[j].date : "";
    const acrossPage = records[j-1].last && j < records.length && records[j].first && records[j].page === records[j-1].page + 1;
    const fill = acrossPage ? (next || prev) : (prev || next);
    for (let k=i;k<j;k++) records[k].date = fill;
    i = j - 1;
  }
  let ck = "";
  for (const r of records){
    if (r.kind) ck = r.kind; else r.kind = ck;
    const dm = (r.date||"").match(/(\d{1,2})月(\d{1,2})日/);
    r.day = dm ? +dm[2] : 0;
    delete r.page; delete r.first; delete r.last;
  }
}
// 戻り値: {users:{key:{name,records:[{date,day,kind,time,content,recorder}]}}, diag}
async function parseKirokuDoc(pdf){
  const users = {};
  const diag = { pages:pdf.numPages, nippouPages:0, kirokuPages:0, attRows:0, noteRows:0, kirokuRows:0, skipped:[] };
  let lastKey = null;
  const kirokuKeys = new Set();
  for (let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const lines = kGroupLines(tc.items);
    if (parseNippouPage(lines, users, diag)) continue;
    const nameLine = lines.find(l=>/氏\s*名\s*[:：]/.test(kLineText(l)));
    let key = null;
    if (nameLine){
      const m = kLineText(nameLine).match(/氏\s*名\s*[:：]\s*(.+)/);
      if (m){ const name = m[1].split("(")[0].split("（")[0].trim(); key = norm(name); if (!users[key]) users[key] = { name, records:[] }; lastKey = key; }
    }
    if (!key) key = lastKey;
    if (!key){ diag.skipped.push(p); continue; }
    let cols = null;
    try { const {H,V} = await pageRules(page); cols = buildGrid(H,V); } catch(e){ cols = null; }
    const its = tc.items.filter(i=>i.str && i.str.trim()).map(i=>({ str:i.str, x:i.transform[4], y:i.transform[5] + Math.abs(i.transform[3])*0.32, w:i.width||0 }));
    const recs = cols ? parseKirokuGrid(cols, its) : null;
    if (!recs){ diag.skipped.push(p); continue; }
    diag.kirokuPages++;
    kirokuKeys.add(key);
    recs.forEach((r,i)=>{ r.page = p; r.first = (i===0); r.last = (i===recs.length-1); users[key].records.push(r); });
    diag.kirokuRows += recs.length;
  }
  kirokuKeys.forEach(k=>fillDates(users[k].records));
  return { users, diag };
}
// 「2026年9月3日」「9月3日」→ YYYY-MM-DD（年が無い場合は ym を使う）
function kirokuDate(r, ym){
  const full = (r.date||"").match(/(\d{2,4})年(\d{1,2})月(\d{1,2})日/);
  if (full) return toYear(+full[1])+"-"+String(+full[2]).padStart(2,"0")+"-"+String(+full[3]).padStart(2,"0");
  const md = (r.date||"").match(RE_MD);
  if (md && ym) return ym.slice(0,4)+"-"+String(+md[1]).padStart(2,"0")+"-"+String(+md[2]).padStart(2,"0");
  return "";
}

// ===== LINE トーク履歴（.txt） =====
function parseLine(text){
  const t = text.replace(/\r\n/g,"\n");
  const msgs = []; let cur = null;
  for (const raw of t.split("\n")){
    const line = raw.replace(/​/g,"");
    const dm = line.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
    if (dm){ cur = { y:+dm[1], m:+dm[2], d:+dm[3] }; continue; }
    const tm = line.match(/^(\d{1,2}:\d{2})[\t ](.*)$/);
    if (tm && cur){ const rest=tm[2]; const sp=rest.indexOf('\t'); msgs.push({ ...cur, time:tm[1], sender: sp>=0?rest.slice(0,sp):'', text: sp>=0?rest.slice(sp+1):rest }); }
    else if (msgs.length && line.trim()){ msgs[msgs.length-1].text += "\n" + line.trim(); }
  }
  return msgs;
}
const RE_HOUSE_KW = /モーニングコール|オンコール|服薬|お薬|内服|軟膏|塗布|外用|貼付|処方|受診|往診|訪問診療|訪問看護|歯科|通院|ご家族|家族|面会|来訪|朝食|昼食|夕食|朝ご飯|昼ご飯|夕ご飯|完食|食事|入居者|号室|ハウス/;
