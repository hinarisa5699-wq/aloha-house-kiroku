// アロハハウス入居者記録アプリ  利用者基本（基本情報・家族・主治医・服薬・バイタル・機能訓練メニュー）
// app.js の後に読み込む。保存先：GAS「プロフィール」シート（利用者ID×キー、値はJSON）
(function(){
const TRAIN_SEED={
 "cover": {
  "usage": "・本日はよろしくお願いいたします。担当される方のページ（1人1枚）だけをお読みいただければ進められます。\n・回数はあくまで目安です。少なくても構いません。表情・呼吸・痛みの訴えを見ながら進めてください。\n・体調が優れない日は、座ったままの内容だけで終了していただいて構いません。\n・迷ったときは「やらない・看護師に確認する」を選んでください。それが正解です。",
  "contacts": [
   {
    "when": "体調の変化・痛み・皮膚やストマのこと",
    "to": "まず看護師（大山・池田）"
   },
   {
    "when": "訓練の内容やメニューの相談",
    "to": "機能訓練指導員（理学療法士　土屋・西田）"
   },
   {
    "when": "記録の入力方法・その他",
    "to": "デイサービス職員 → 管理者"
   }
  ],
  "footer": "株式会社イケイケカンパニー　アロハデイサービス　東京都町田市森野4-17-17　TEL 042-785-5023",
  "record": "記録：カイポケの「機能訓練」に、実施○／×・時間・内容・様子を入力。中止した日も×で記録。"
 },
 "people": {
  "木藤 慧": {
   "name": "木藤 慧",
   "kana": "きとう さとし",
   "caution": "血圧が低い・パーキンソン病・転倒歴あり",
   "summary": "パーキンソン病／要介護2。T字杖で歩行（見守り〜軽介助）。血圧が普段から低い方（上が70〜100台）。首と肩の痛みが続いています。",
   "vitals": {
    "temp": "36.5〜36.9℃",
    "bp": "80／55 前後\n（上は69〜110）",
    "pulse": "50〜60台",
    "spo2": "96〜98%",
    "weight": "56〜57kg"
   },
   "vitalsNote": "上の血圧が70〜80台でも、この方にとっては普段どおりです。数値だけで判断せず、ふらつきや気分不快の有無で見てください。脈も普段から50台です。",
   "history": [
    "首と肩のストレッチ、リラクゼーション（毎回やっています）",
    "座ったままの軽体操、転倒予防体操",
    "もも上げ、膝伸ばし、スクワット、体をひねる運動",
    "足踏み、足首回し",
    "室内歩行／屋外歩行（T字杖・見守り〜軽介助）"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "あいさつ・体調確認",
     "count": "首と肩の痛み、めまいを聞く"
    },
    {
     "t": "3分",
     "what": "深呼吸／肩の上げ下げ／足首の曲げ伸ばし",
     "count": "深呼吸5回・肩10回・足首20回"
    },
    {
     "t": "6分",
     "what": "首と肩のストレッチ・リラクゼーション\n（横に倒す・肩甲骨寄せ・首肩を手でほぐす）",
     "count": "首20秒×左右2回\n肩甲骨寄せ10回・ほぐし2〜3分"
    },
    {
     "t": "4分",
     "what": "座ったまま もも上げ／膝伸ばし／体をひねる／立ち座り",
     "count": "もも上げ左右10回×2\n膝伸ばし左右10回・立ち座り5回"
    },
    {
     "t": "4分",
     "what": "歩行（室内を見守りで）\n※調子が良い日はT字杖でハウス周り1〜2周",
     "count": "室内1〜2往復"
    },
    {
     "t": "2分",
     "what": "転倒予防体操・深呼吸・水分・記録",
     "count": "深呼吸5回"
    }
   ],
   "rules": [
    "立ち上がりはゆっくり。座ったまま一呼吸おいてから。",
    "歩き出しの一歩が出にくい方。腕を引っ張らず「いち・に」と声かけ。",
    "ストレッチは「痛気持ちいい」まで。強く引っ張らない。",
    "水分は座って少量ずつ（むせやすい方です）。",
    "靴の履き替えは必ず座って（9月4日に転倒あり）。",
    "皮膚の処置をしている部位はマッサージしない。"
   ],
   "stop": [
    "ふらつき・気分が悪い・顔色が悪い",
    "首や肩の痛みが運動前より強くなった",
    "眠気が強い日は歩行をやめ、座ったままのストレッチのみに"
   ],
   "note": ""
  },
  "塚野 節子": {
   "name": "塚野 節子",
   "kana": "つかの せつこ",
   "caution": "脳出血後遺症・足のトラブル・歩行器",
   "summary": "脳出血後遺症／要介護2。歩行器で屋外歩行ができます。体重37kg前後と小柄。外反母趾と巻き爪があります。",
   "vitals": {
    "temp": "36.4〜36.8℃",
    "bp": "115／78 前後\n（上は85〜143）",
    "pulse": "80〜95",
    "spo2": "96〜99%",
    "weight": "36.6〜37.0kg"
   },
   "vitalsNote": "この範囲から大きく外れたときは、運動の前に看護師へ確認してください。",
   "history": [
    "屋内の軽体操、ストレッチ",
    "屋外歩行（歩行器でハウス周り2〜3周）",
    "平行棒内で横歩き・大股歩き・もも上げ",
    "肩甲骨まわりの運動、下肢の可動域訓練",
    "ゴルフボールで足底マッサージ、割り箸でビーズ移し",
    "自主トレとして廊下を5〜7往復されています"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "あいさつ・足の痛みの確認",
     "count": "夜に足がつらなかったかも聞く"
    },
    {
     "t": "3分",
     "what": "深呼吸／足首の曲げ伸ばし／ふくらはぎを伸ばす",
     "count": "深呼吸5回・足首20回\nふくらはぎ20秒×左右2回"
    },
    {
     "t": "4分",
     "what": "もも上げ／キッキング（膝伸ばし）",
     "count": "もも上げ左右10回×2\nキッキング左右10回×2"
    },
    {
     "t": "4分",
     "what": "肩甲骨まわりの運動（肩甲骨寄せ・肩まわし）",
     "count": "肩甲骨寄せ10回\n肩まわし前後各10回"
    },
    {
     "t": "6分",
     "what": "屋外歩行：歩行器でハウス周り\n※雨天は平行棒内で横歩き・大股歩き・もも上げ",
     "count": "2〜3周\n（平行棒は5〜8往復）"
    },
    {
     "t": "2分",
     "what": "ふくらはぎを伸ばす・記録",
     "count": "20秒×左右"
    }
   ],
   "rules": [
    "もも上げは腰が反らないように。背中を背もたれにつける。腰が痛ければ中止。",
    "歩行中に足の痛みを訴えたら中止。",
    "足がつりやすい方。運動の前後にふくらはぎを伸ばし、水分をすすめる。",
    "手すりや歩行器を強く握らせない（手のひらにすり傷が出たことがあります）。",
    "目のかすみあり。段差は「段差あります」と声に出して伝える。",
    "小柄で転倒リスクが大きい方。屋外歩行は必ず横につく。",
    "時間が余ったら：ゴルフボールで足底マッサージ（2分）、割り箸でビーズ移し（3分）。"
   ],
   "stop": [
    "腰や足の痛みが出た",
    "歩行中に息切れが出た（普段は会話しながら歩けています。記録も残す）",
    "ふらつき・気分が悪い"
   ],
   "note": ""
  },
  "新城 早苗": {
   "name": "新城 早苗",
   "kana": "しんじょう さなえ",
   "caution": "抗がん剤治療中・人工肛門（ストマ）・認知症",
   "summary": "S状結腸がんで抗がん剤治療中／要介護2。人工肛門（ストマ）とCVポートあり。認知症あり。歩行はフリーハンド見守りで屋外2周可能。",
   "vitals": {
    "temp": "36.5〜36.9℃",
    "bp": "100／66 前後\n（上は82〜129）",
    "pulse": "70〜85",
    "spo2": "95〜98%",
    "weight": "—"
   },
   "vitalsNote": "37.5℃以上の発熱、寒気、ふるえがあるときは運動せず、すぐ看護師へ。37.1〜37.2℃の微熱が出た日もあります。",
   "history": [
    "屋内の軽体操、ストレッチ、脳トレ体操",
    "屋外歩行（フリーハンド見守りでハウス周り2周、または2往復）",
    "平行棒内で横歩き・腿上げ・踵上げ・大股歩き5往復",
    "肩甲骨のリラクゼーション（左肩が痛む日）",
    "転倒予防体操、片脚立位（安定してできています）"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "あいさつ・パウチの確認・手足のしびれを聞く",
     "count": "—"
    },
    {
     "t": "3分",
     "what": "深呼吸／肩の上げ下げ／足首の曲げ伸ばし",
     "count": "深呼吸3回・肩10回・足首20回"
    },
    {
     "t": "4分",
     "what": "肩甲骨寄せ／首を横に倒す",
     "count": "肩甲骨寄せ10回・首20秒×左右\n※左肩は痛くない範囲まで"
    },
    {
     "t": "3分",
     "what": "脳トレ体操（向かい合って同じ動きを一緒に）",
     "count": "1〜2種目"
    },
    {
     "t": "4分",
     "what": "平行棒内で 横歩き・もも上げ・踵上げ・大股歩き",
     "count": "計5往復"
    },
    {
     "t": "4分",
     "what": "ハウス周りを歩く（必ず横につく）",
     "count": "2周"
    },
    {
     "t": "1分",
     "what": "深呼吸・記録",
     "count": "深呼吸3回"
    }
   ],
   "rules": [
    "37.5℃以上の発熱・寒気・ふるえは運動せず、すぐ看護師へ。様子を見ない。",
    "だるさ・吐き気・食事が取れない日は座位のみ10分程度で終了。",
    "手足のしびれがある日は介助を増やす。手すりは軽く添える程度に。",
    "強く押すマッサージはしない。ぶつけない、転ばせない。",
    "腹筋運動など、おなかに力を入れる運動と強い前屈はしない。",
    "CVポート側の腕を強く引っ張らない。パウチを締め付けない。",
    "指示は一つずつ短く。左右で違う動きはさせず、同じ動きを一緒に。"
   ],
   "stop": [
    "発熱・寒気・ふるえ（最優先。運動せず報告）",
    "ふらつき・息切れ・動悸",
    "新しいあざや皮下出血／パウチのふくらみ・剥がれ"
   ],
   "note": ""
  },
  "大嶋 美佐子": {
   "name": "大嶋 美佐子",
   "kana": "おおしま みさこ",
   "caution": "夜間不穏・見当識の低下・下肢のむくみ",
   "summary": "令和8年9月に入居、デイリハを始めたばかりの方。肩こりが強く肩甲骨まわりの動きが狭い。足にむくみあり。トイレが頻回です。",
   "vitals": {
    "temp": "36.2〜37.2℃",
    "bp": "130／75 前後\n（上は97〜154）",
    "pulse": "70〜80",
    "spo2": "95〜98%",
    "weight": "—"
   },
   "vitalsNote": "9月の4回分のみの数字です。上が150台まで上がった日、37℃台の微熱が出た日があります。いずれも看護師に確認してから進めてください。",
   "history": [
    "肩甲骨まわりの運動とマッサージ",
    "頸部のストレッチ、リラクゼーション",
    "全身の軽体操、椅子スクワット",
    "椅子に座っての足踏み（下肢のむくみ対策）",
    "脳トレ体操"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "トイレの声かけ・あいさつ",
     "count": "先にトイレをすませていただく"
    },
    {
     "t": "3分",
     "what": "深呼吸／肩の上げ下げ／首をゆっくり左右に向ける",
     "count": "深呼吸5回・肩10回・首左右各5回"
    },
    {
     "t": "6分",
     "what": "肩甲骨寄せ／肩まわし／首を横に倒す／肩を手でほぐす",
     "count": "肩甲骨寄せ10回・肩まわし前後各10回\n首20秒×左右・ほぐし2分"
    },
    {
     "t": "4分",
     "what": "体をひねる／バンザイ／膝伸ばし（すべて座って）",
     "count": "体幹左右10回・バンザイ10回\n膝伸ばし左右10回"
    },
    {
     "t": "4分",
     "what": "座って足踏み／足首回し／つま先上げ・かかと上げ",
     "count": "足踏み50回・足首回し左右10回\nつま先・かかと各20回"
    },
    {
     "t": "2分",
     "what": "脳トレ体操・記録",
     "count": "1〜2分"
    }
   ],
   "rules": [
    "肩の動く範囲が狭い方。動く範囲だけでOK。無理に伸ばさない。",
    "むくみ対策は足踏みと足首回しで。強く押すマッサージはしない。",
    "トイレの訴えがあれば途中で中断してよい。",
    "眠気や頭痛が強い日は歩行を入れず、座ったままの運動のみに。",
    "「休みましょう」と促しても起き上がられる方。無理に休ませない。",
    "居室でつまずいたことあり。足元に物を置かない、移動時は横につく。"
   ],
   "stop": [
    "37℃台の微熱（看護師に確認してから開始する）",
    "ふらつき・頭痛が強い",
    "むくみが普段より増えている"
   ],
   "note": "個別機能訓練計画書は作成中です。完成したら計画書の内容を優先してください。"
  },
  "清藤 弘子": {
   "name": "清藤 弘子",
   "kana": "きよふじ ひろこ",
   "caution": "慢性心不全・左顔面麻痺・左耳が聞こえにくい",
   "summary": "89歳／要介護1。慢性心不全と不整脈（心房細動）があり、最も慎重に進める方です。左顔面に麻痺、左耳の聞こえが悪い。屋外歩行は杖を使用。",
   "vitals": {
    "temp": "36.4〜36.5℃",
    "bp": "137／78 →（再検）105／52",
    "pulse": "83〜102",
    "spo2": "—",
    "weight": "52kg"
   },
   "vitalsNote": "記録がまだ少なく、値が大きく動きます。不整脈があるため脈も速くなりがちです。毎回2回測り、脈の乱れがないかを必ず看護師と確認してください。",
   "history": [
    "9月16日が初めてのデイリハ（1回のみ）",
    "ご自身で行っている自主トレを少し改善してお伝えしています",
    "膝の痛みが続くようなら機能訓練指導員へ報告することになっています"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "右側に立ってあいさつ・体調確認",
     "count": "息切れ・むくみ・脈の乱れを見る"
    },
    {
     "t": "3分",
     "what": "深呼吸／肩の上げ下げ／足首の曲げ伸ばし",
     "count": "深呼吸5回・肩10回・足首20回\n※すべてゆっくり"
    },
    {
     "t": "5分",
     "what": "首を横に倒す／肩まわし／ふくらはぎを伸ばす",
     "count": "首20秒×左右・肩まわし前後各5回\nふくらはぎ20秒×左右"
    },
    {
     "t": "3分",
     "what": "座って足踏み → そのあと休憩",
     "count": "足踏み30回・休憩1分"
    },
    {
     "t": "5分",
     "what": "杖を使って室内を歩く（見守り）",
     "count": "1往復から。会話ができるペースまで"
    },
    {
     "t": "3分",
     "what": "深呼吸・水分・記録",
     "count": "深呼吸5回"
    }
   ],
   "rules": [
    "息切れ・動悸・脈の乱れ・むくみの増加・強い疲労感が出たら、その場で中止。",
    "このメニューが上限。回数や距離を増やすときは看護師と理学療法士の確認を取る。",
    "必ず右側に立ち、顔を見てゆっくり短い言葉で話す（左耳が聞こえにくい）。",
    "水分は座って少量ずつ。左側にたまりやすくむせることがあります。",
    "糖尿病あり。冷汗・ふるえ・ぼんやりした様子があれば中止して看護師へ。",
    "膝の痛みの訴えがあります。痛みが出る動きは避け、続くようなら報告する。",
    "「20分やりきること」より「息が上がらないこと」を優先。"
   ],
   "stop": [
    "息切れ・動悸・脈の乱れ",
    "むくみが増えている",
    "冷汗・ふるえ・ぼんやりしている／むせこみが続く"
   ],
   "note": "個別機能訓練計画書は未作成です。当面は機能訓練指導員の指示のもとで行ってください。"
  },
  "水越 大一郎": {
   "name": "水越 大一郎",
   "kana": "みずこし だいいちろう",
   "caution": "重度の難聴（左耳から）・退院直後・歩行は手引き",
   "summary": "令和8年9月16日にアロハハウス302号室へ入居。前日まで入院されていました。重度の難聴があり、左耳の側から話しかけます。部屋からデイへの移動は車椅子。フロア内は4点杖と左脇の介助でゆっくり歩けますが、杖は不安定なため訓練の歩行は手引きで行います。",
   "vitals": {
    "temp": "—",
    "bp": "156／76 →（同日）79／48",
    "pulse": "66〜72",
    "spo2": "—",
    "weight": ""
   },
   "vitalsNote": "9月17日の1日分のみです。同じ日のうちに上が156から79まで大きく動いています。運動の前後で必ず測っていただき、看護師に確認してから進めてください。",
   "history": [
    "9月17日が初めてのデイリハ（1回のみ）",
    "ご本人から「歩行訓練をしたい」とご希望がありました",
    "下肢の運動 → 両手引きで室内を往復歩行。方向転換も安定していました",
    "入浴は2人介助でまたぎができました（ふらつきは強めです）",
    "トイレは立位ができるので1人介助で対応しています"
   ],
   "menu": [
    {
     "t": "1分",
     "what": "あいさつ・体調確認・トイレの声かけ",
     "count": "左耳の側から。伝わらなければ書いて見せる"
    },
    {
     "t": "5分",
     "what": "座って下肢の運動\n（足首の曲げ伸ばし／もも上げ／膝伸ばし）",
     "count": "足首20回\nもも上げ左右10回・膝伸ばし左右10回"
    },
    {
     "t": "3分",
     "what": "座って上半身の体操（肩まわし・深呼吸）",
     "count": "肩まわし前後各10回・深呼吸5回"
    },
    {
     "t": "3分",
     "what": "立ち上がり練習（テーブルにつかまって）",
     "count": "3〜5回　※必ず横につく"
    },
    {
     "t": "6分",
     "what": "両手引きで室内を歩く",
     "count": "1〜2往復\n方向転換はゆっくり"
    },
    {
     "t": "2分",
     "what": "座って深呼吸・記録",
     "count": "深呼吸5回"
    }
   ],
   "rules": [
    "重度の難聴です。左耳の側から、顔を見て、ゆっくり短い言葉で話しかけてください。",
    "伝わらないときはホワイトボードに大きな字で書いて見せてください（筆談が一番確実です）。目も見えにくい方です。",
    "杖歩行は非常に不安定です。訓練の歩行は必ず手引き（両手引き）で行い、杖だけで歩かせないでください。",
    "ふらつきが強い方です。立ち上がりと立位の運動は必ず横につき、椅子やテーブルを支えにしてください。",
    "血圧の動きが大きい方です。立ち上がりはゆっくり、一呼吸おいてから。",
    "退院されたばかりで体力が落ちています。疲れた様子があればそこで終了して構いません。",
    "車椅子に座りっぱなしにせず、デイでは椅子に座り替えていただいてください。"
   ],
   "stop": [
    "ふらつきが強い・立ち上がれない",
    "血圧がいつもと大きく違う／気分が悪い",
    "疲労が強い（初日は14時にお部屋へ戻られています）",
    "おなかの張り・排便困難の訴え（夜間のナースコールが続いています）"
   ],
   "note": "個別機能訓練計画書は未作成です。当面は機能訓練指導員の指示のもとで行ってください。カラオケがお好きなので、レクにお誘いすると喜ばれます。"
  }
 }
};
D.profiles=D.profiles||[];
const P={rid:null, stats:{}, edit:{}};
const TIMES=['起床時','朝','昼','夕','就寝時','頓服'];
const profOf=(rid,key)=>{ const r=D.profiles.find(p=>p['利用者ID']===String(rid)&&p['キー']===key); if(!r) return null; try{ return JSON.parse(r['値']); }catch(e){ return r['値']; } };
async function saveProf(rid,key,value){ await api('saveProfile',{residentId:String(rid),key,value}); D.profiles=D.profiles.filter(p=>!(p['利用者ID']===String(rid)&&p['キー']===key)); D.profiles.push({'利用者ID':String(rid),'キー':key,'値':JSON.stringify(value)}); }
const cur=()=>D.allResidents.find(r=>r.id===P.rid)||D.residents[0];
const fmtD=s=>s?String(s).replace(/-/g,'/'):'';
const nl=s=>esc(s).replace(/\n/g,'<br>');
function ageFromBirth(b){ if(!b) return ''; const a=new Date(b+'T00:00:00'), n=new Date(); let y=n.getFullYear()-a.getFullYear(); if(n.getMonth()<a.getMonth()||(n.getMonth()===a.getMonth()&&n.getDate()<a.getDate())) y--; return y; }
function wareki(b){ if(!b) return ''; const [y,m,d]=b.split('-').map(Number); const e=y>=2019?['令和',y-2018]:y>=1989?['平成',y-1988]:y>=1926?['昭和',y-1925]:['大正',y-1911]; return `${e[0]}${e[1]===1?'元':e[1]}年${m}月${d}日`; }
const lines=s=>String(s||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
const seedFor=r=>{ const k=Object.keys(TRAIN_SEED.people||{}).find(n=>normName(n)===normName(r['氏名'])); return k?TRAIN_SEED.people[k]:null; };
const trainingOf=r=>profOf(r.id,'training')||seedFor(r)||null;

// ---------- バイタル集計（取込記録の内容から） ----------
function parseVitals(text){
  // カイポケ側の入力ミス（89/525、SpO2 38 など）を除くため、あり得る範囲の値だけ採用する
  const t=String(text||''); const o={}; const inR=(v,a,b)=>v>=a&&v<=b?v:null;
  let m=t.match(/体温[：:\s]*(\d{2}(?:\.\d)?)/); if(m){ const v=inR(+m[1],34,42); if(v!=null) o.temp=v; }
  m=t.match(/血圧[：:\s]*(\d{2,3})\s*[\/／]\s*(\d{2,3})/); if(m){ const a=inR(+m[1],60,250), b=inR(+m[2],30,150); if(a!=null) o.sbp=a; if(b!=null&&a!=null&&b<a) o.dbp=b; }
  m=t.match(/脈(?:拍)?[：:\s]*(\d{2,3})/); if(m){ const v=inR(+m[1],30,200); if(v!=null) o.pulse=v; }
  m=t.match(/SpO2[：:\s]*(\d{2,3})/i); if(m){ const v=inR(+m[1],80,100); if(v!=null) o.spo2=v; }
  m=t.match(/体重[：:\s]*(\d{2,3}(?:\.\d)?)/); if(m){ const v=inR(+m[1],25,150); if(v!=null) o.weight=v; }
  return Object.keys(o).length?o:null;
}
async function loadStats(rid){
  if(P.stats[rid]) return P.stats[rid];
  const now=new Date(); const yms=[0,1,2].map(k=>{ const d=new Date(now.getFullYear(),now.getMonth()-k,1); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; });
  const recs=[];
  for(const ym of yms){ try{ const m=await api('month',{ym,residentId:rid}); for(const e of (m.ext||[])){ if(e['利用者ID']!==rid) continue; const v=parseVitals(e['内容']); if(v) recs.push({date:e['日付'],time:e['時刻'],src:e['出所'],...v}); } }catch(e){} }
  recs.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const st={n:recs.length, from:recs[0]?recs[0].date:'', to:recs.length?recs[recs.length-1].date:''};
  for(const k of ['temp','sbp','dbp','pulse','spo2','weight']){ const v=recs.filter(r=>r[k]!=null).map(r=>r[k]); if(!v.length) continue; const s=v.slice().sort((a,b)=>a-b); st[k]={n:v.length, avg:v.reduce((a,b)=>a+b,0)/v.length, min:s[0], max:s[s.length-1], p10:s[Math.floor((s.length-1)*0.1)], p90:s[Math.floor((s.length-1)*0.9)], last:v[v.length-1]}; }
  st.recent=recs.slice(-5).reverse();
  P.stats[rid]=st; return st;
}
const f1=v=>v==null?'—':(Math.round(v*10)/10).toString();
const f0=v=>v==null?'—':Math.round(v).toString();
function statsHtml(st){
  if(!st||!st.n) return '<span class="muted">取込記録（デイ介護記録・訪看記録書Ⅱ）にバイタルがまだありません</span>';
  const row=(lb,k,f,unit)=>{ const s=st[k]; if(!s) return `<tr><td class="l">${lb}</td><td colspan="4" class="muted">記録なし</td></tr>`; return `<tr><td class="l">${lb}</td><td><b>${f(s.avg)}</b>${unit}</td><td>${f(s.p10)}〜${f(s.p90)}</td><td>${f(s.min)}〜${f(s.max)}</td><td>${s.n}回</td></tr>`; };
  return `<table class="grid"><tr><th></th><th>平均</th><th>ふだんの範囲<br><small>(中央8割)</small></th><th>最小〜最大</th><th>回数</th></tr>${row('体温','temp',f1,'℃')}${row('血圧（上）','sbp',f0,'')}${row('血圧（下）','dbp',f0,'')}${row('脈拍','pulse',f0,'')}${row('SpO2','spo2',f0,'%')}${row('体重','weight',f1,'kg')}</table><div class="muted">集計：${fmtD(st.from)}〜${fmtD(st.to)} の取込記録 ${st.n}回分（デイ介護記録・訪看記録書Ⅱ）</div>`;
}
function suggestBath(st){
  const b={}; if(!st||!st.n) return b;
  if(st.temp) b.tempMax=Math.min(37.5, Math.round((st.temp.avg+0.7)*10)/10);
  if(st.sbp){ b.sbpMax=Math.round(Math.min(180, st.sbp.avg+30)/5)*5; b.sbpMin=Math.round(Math.max(80, st.sbp.avg-25)/5)*5; }
  if(st.dbp) b.dbpMax=Math.round(Math.min(100, st.dbp.avg+20)/5)*5;
  if(st.pulse){ b.pulseMax=Math.round(Math.min(110, st.pulse.avg+25)/5)*5; b.pulseMin=Math.round(Math.max(45, st.pulse.avg-15)/5)*5; }
  if(st.spo2) b.spo2Min=Math.max(90, Math.round(st.spo2.avg-3));
  return b;
}
function bathHtml(b){
  if(!b||!Object.keys(b).some(k=>b[k]!==''&&b[k]!=null&&k!=='note')) return '<span class="muted">未設定（「編集」→「平均から提案」で入れられます）</span>';
  const c=[]; if(b.tempMax) c.push(`体温 ${b.tempMax}℃未満`); if(b.sbpMin||b.sbpMax) c.push(`血圧（上）${b.sbpMin||'—'}〜${b.sbpMax||'—'}`); if(b.dbpMax) c.push(`血圧（下）${b.dbpMax}以下`); if(b.pulseMin||b.pulseMax) c.push(`脈拍 ${b.pulseMin||'—'}〜${b.pulseMax||'—'}`); if(b.spo2Min) c.push(`SpO2 ${b.spo2Min}%以上`);
  return `<div><b>入浴OKの目安：</b>${c.join('　')}</div>${b.note?`<div class="muted">${nl(b.note)}</div>`:''}<div class="muted" style="font-size:11.5px">目安から外れたら入浴前に看護師へ確認</div>`;
}

// ---------- 画面 ----------
function fillRes(){ const sel=$('#bRes'); const v=P.rid; sel.innerHTML=D.residents.map(r=>`<option value="${r.id}">${esc(r['部屋'])} ${esc(r['氏名'])}</option>`).join(''); if(v&&D.residents.some(r=>r.id===v)) sel.value=v; P.rid=sel.value; }
function card(id,title,view,btn){ return `<div class="card" id="bc-${id}"><div class="row" style="align-items:center"><h2 style="margin:0;flex:1">${title}</h2>${btn!==false?`<button class="btn" data-edit="${id}" style="flex:none">編集</button>`:''}</div><div class="bview scroll" style="margin-top:6px">${view}</div><div class="bform hide" style="margin-top:8px"></div></div>`; }
// 通所介護計画書（拡張機能がカイポケから取り込む。キー dayplan）
function dayplanHtml(dp,forPrint){
  if(!dp) return '';
  const p=dp.plan||{}; const row=(k,v)=>v?`<div style="margin-top:3px"><b>${k}：</b>${nl(v)}</div>`:'';
  const li=a=>(a&&a.length)?`<ul class="tr-ul">${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
  const head=`<div class="muted" style="font-size:11.5px">カイポケ 通所介護計画書${p.madeYmd?'（作成 '+fmtD(p.madeYmd)+(p.maker?'　'+esc(p.maker):'')+'）':'（計画書なし）'}${dp.updatedAt?'　取込 '+esc(String(dp.updatedAt).slice(0,10)):''}</div>`;
  if(!dp.plan) return head;
  if(forPrint) return head+row('健康状態（病名・服薬）',p.disease)+row('医学的リスク・留意事項',p.risk)+row('本人の希望',p.wishSelf)+row('家族の希望',p.wishFamily);
  return head+row('健康状態（病名・合併症・服薬状況）',p.disease)+row('ケアの上での医学的リスク・留意事項',p.risk)+row('本人の希望',p.wishSelf)+row('家族の希望',p.wishFamily)+row('解決すべき課題',p.issues)+row('通所介護利用までの経緯（活動歴・病歴）',p.history)+row('自宅での活動・参加の状況',p.activity)+(p.longGoal&&p.longGoal.length?`<div style="margin-top:3px"><b>長期目標：</b>${li(p.longGoal)}</div>`:'')+(p.shortGoal&&p.shortGoal.length?`<div><b>短期目標：</b>${li(p.shortGoal)}</div>`:'')+(p.services&&p.services.length?`<div><b>サービス内容：</b>${li(p.services)}</div>`:'')+row('特記事項',p.special);
}
// デイサービスでの活動（キー dayact：{likes, dislikes, log:[{date,act,note}]}）
function dayactHtml(a){
  a=a||{}; const log=(a.log||[]).slice().sort((x,y)=>(y.date||'').localeCompare(x.date||''));
  const t=`<table class="grid kv"><tr><th style="width:90px">好きな活動</th><td style="text-align:left">${a.likes?nl(a.likes):'<span class="muted">未登録</span>'}</td></tr><tr><th>苦手な活動</th><td style="text-align:left">${a.dislikes?nl(a.dislikes):'<span class="muted">未登録</span>'}</td></tr></table>`;
  const l=log.length?`<div style="margin-top:6px"><b>行った活動</b></div><table class="grid"><tr><th style="width:90px">日付</th><th>活動</th><th>様子・メモ</th></tr>${log.slice(0,30).map(x=>`<tr><td>${esc(fmtD(x.date))}</td><td class="l" style="white-space:normal">${esc(x.act)}</td><td class="l" style="white-space:normal">${esc(x.note||'')}</td></tr>`).join('')}</table>${log.length>30?`<div class="muted">ほか ${log.length-30}件</div>`:''}`:'<div class="muted" style="margin-top:6px">行った活動：まだ記録がありません（「編集」で追加）</div>';
  return t+l;
}
const dayactRow=x=>`<tr><td><input type="date" data-k="date" value="${esc(x.date||'')}" style="width:140px"></td><td><input data-k="act" value="${esc(x.act||'')}" placeholder="例：カラオケ、塗り絵、体操" style="min-width:160px"></td><td><input data-k="note" value="${esc(x.note||'')}" placeholder="様子・反応" style="min-width:180px"></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>`;
// 訪看 看護記録書Ⅰ・指示書（拡張機能がカイポケから取り込む。キー hncsheet）
function hncsheetHtml(h){
  if(!h) return ''; const o=h.order; const row=(k,v)=>v?`<div style="margin-top:3px"><b>${k}：</b>${nl(v)}</div>`:'';
  let out=`<div class="muted" style="font-size:11.5px">${h.madeYmd?'看護記録書Ⅰ（ADL・看護等）作成 '+fmtD(h.madeYmd):'看護記録書Ⅰなし'}${h.updatedAt?'　取込 '+esc(String(h.updatedAt).slice(0,10)):''}</div>`;
  if(o) out+=`<div style="margin-top:4px"><b>指示書：</b>${esc(fmtD(o.from))}〜${esc(fmtD(o.to))}　${esc(o.kind||'')}　<b>${esc(o.hospital)}</b> ${esc(o.doctor)}${o.hospitalTel?'　'+telLink(o.hospitalTel):''}<br><b>傷病名：</b>${esc((o.diseases||[]).join('、'))}</div>`;
  const meds=h.meds||[];
  if(meds.length) out+=`<div style="margin-top:6px"><b>薬剤（訪看の記録より）</b></div><table class="grid"><tr><th style="width:64px">区分</th><th>名称</th><th style="width:90px">量・数量</th><th>注意・補足</th></tr>${meds.map(m=>`<tr><td>${esc(m.kind)}</td><td class="l" style="white-space:normal">${esc(m.name)}</td><td>${esc(m.qty||'')}</td><td class="l" style="white-space:normal">${esc(m.guide||'')}</td></tr>`).join('')}</table>`;
  out+=row('薬事特記事項',h.medicineComment)+row('服薬の状況',h.adl&&h.adl.medicine);
  const a=h.adl||{}; const adl=[['食事',a.meal],['移動',a.move],['入浴',a.bath],['意思疎通',a.expression],['コミュニケーション',a.communication]].filter(x=>x[1]);
  if(adl.length) out+=`<div style="margin-top:6px"><b>ADL・様子</b></div>`+adl.map(x=>`<div><b>${x[0]}：</b>${nl(x[1])}</div>`).join('');
  out+=row('現病歴',h.historyPresent)+row('既往歴',h.historyPast)+row('療養状況',h.restCondition)+row('介護状況',h.nursingCondition)+row('家族構成',h.familyStructure)+row('住環境',h.housing);
  return out;
}
function renderBase(){
  const r=cur(); if(!r){ $('#baseOut').innerHTML='<div class="card">入居者が登録されていません</div>'; return; }
  P.rid=r.id; const b=profOf(r.id,'basic')||{}; const fam=profOf(r.id,'family')||[]; const meds=profOf(r.id,'meds')||{times:{}}; const dis=profOf(r.id,'diseases')||[]; const bath=profOf(r.id,'bath')||{}; const tr=trainingOf(r); const cs=contactsOf(r.id);
  const age=ageFromBirth(b.birth);
  const basic=`<table class="grid kv"><tr><th>部屋</th><td>${esc(r['部屋'])}</td><th>ふりがな</th><td>${esc(r['ふりがな'])}</td></tr><tr><th>性別</th><td>${esc(b.sex||'')}</td><th>生年月日</th><td>${b.birth?esc(wareki(b.birth))+`（${age}歳）`:''}</td></tr><tr><th>入居日</th><td>${r['入居日']?fmtD(r['入居日'])+'（'+ageOf(r['入居日'])+'）':''}</td><th>食事形態</th><td>${esc(r['食事形態']||'')}</td></tr><tr><th>要介護度</th><td>${esc(b.careLevel||'')}</td><th>認定期間</th><td>${b.certFrom?fmtD(b.certFrom)+'〜'+fmtD(b.certTo):''}</td></tr><tr><th>被保険者番号</th><td>${esc(b.insuredNo||'')}</td><th>医療保険</th><td>${esc(b.medical||'')}</td></tr><tr><th>本人電話</th><td>${telLink(b.tel||'')}</td><th>メモ</th><td>${esc(r['メモ']||'')}</td></tr>${(b.adl||b.dementia)?`<tr><th>自立度（障害）</th><td>${esc(b.adl||'')}</td><th>自立度（認知症）</th><td>${esc(b.dementia||'')}</td></tr>`:''}</table>`;
  const disT=dis.length?`<table class="grid"><tr><th></th><th>傷病名</th><th>病院</th><th>医師</th><th>科</th><th>電話</th><th>受診</th></tr>${dis.map(d=>`<tr><td>${esc(d.type)}</td><td class="l" style="white-space:normal">${esc(d.name)}</td><td class="l">${esc(d.hospital)}</td><td>${esc(d.doctor)}</td><td>${esc(d.dept)}</td><td>${telLink(d.tel)}</td><td>${esc(d.status)}</td></tr>`).join('')}</table>`:'';
  const docs=cs.filter(c=>c['種別']==='主治医・病院');
  const disease=`<div><b>既往歴（要約）：</b>${r['既往歴']?esc(r['既往歴']):'<span class="muted">未登録</span>'}</div>${disT}<div style="margin-top:4px"><b>主治医：</b>${docs.length?docs.map(c=>`${esc(c['事業所'])}${c['担当者']?' '+esc(c['担当者']):''}${c['連絡先']?' '+telLink(c['連絡先']):''}${c['メモ']?'（'+esc(c['メモ'])+'）':''}`).join('／'):'<span class="muted">関係先に「主治医・病院」を登録すると表示</span>'}</div>${b.special?`<div class="muted" style="margin-top:4px">特記：${nl(b.special)}</div>`:''}`;
  const medT=(meds.source?`<div class="muted" style="font-size:11.5px">出所：${esc(meds.source)}（薬が変わったら訪看の記録書Ⅰが更新され、翌日反映）</div>`:'')+`<table class="grid"><tr>${TIMES.map(t=>`<th>${t}</th>`).join('')}</tr><tr>${TIMES.map(t=>`<td style="text-align:left;vertical-align:top;min-width:70px">${nl((meds.times||{})[t]||'')||'<span class="muted">—</span>'}</td>`).join('')}</tr></table><div class="muted">管理：${esc(meds.manage||'未設定')}${meds.note?'　'+nl(meds.note):''}</div>`;
  const famT=fam.length?`<table class="grid"><tr><th>氏名</th><th>続柄</th><th>年齢</th><th>同別居</th><th>電話</th><th>住所・メモ</th><th>緊急</th></tr>${fam.map(f=>`<tr><td class="l">${esc(f.name)}</td><td>${esc(f.rel)}</td><td>${esc(f.age)}</td><td>${esc(f.live)}</td><td>${telLink(f.tel)}</td><td class="l" style="white-space:normal">${esc([f.addr,f.note].filter(Boolean).join(' '))}</td><td>${f.emergency?'◎':''}</td></tr>`).join('')}</table>`:'<span class="muted">未登録</span>';
  const conT=cs.length?cs.map(c=>`<div class="ext" style="border-color:#1d6fb8;background:#eef4fb"><b>${esc(c['種別'])}</b> ${esc(c['事業所'])}${c['担当者']?'　'+esc(c['担当者']):''}${c['連絡先']?'　'+telLink(c['連絡先']):''}${c['メモ']?'<br><span class="m">'+esc(c['メモ'])+'</span>':''}</div>`).join(''):'<span class="muted">未登録</span>';
  const trV=tr?trainingView(tr,r,false)+(profOf(r.id,'training')?'':'<div class="muted">※ 9/19の個別機能訓練メニュー（Word）の内容を初期値として表示しています。「編集」→「保存」で確定します。</div>'):'<span class="muted">未登録（「編集」で作成）</span>';
  const lifeV=(b.life||b.current)?`${b.life?`<div><b>生活歴：</b>${nl(b.life)}</div>`:''}${b.current?`<div style="margin-top:4px"><b>入居前の生活・介護の状況：</b>${nl(b.current)}</div>`:''}`:'<span class="muted">未登録（アセスメントPDFを取り込むと入ります）</span>';
  $('#baseOut').innerHTML=card('basic','基本情報',basic)+card('disease','既往歴・現病・主治医',disease)+(profOf(r.id,'hncsheet')?card('hncsheet','訪問看護の記録（看護記録書Ⅰ・指示書）',hncsheetHtml(profOf(r.id,'hncsheet')),false):'')+(profOf(r.id,'dayplan')?card('dayplan','通所介護計画書（カイポケ）',dayplanHtml(profOf(r.id,'dayplan'),false),false):'')+card('vital','ふだんのバイタル・入浴の目安',`<div id="bStats"><span class="muted">集計中…</span></div><div style="margin-top:6px">${bathHtml(bath)}</div>`)+card('meds','服薬',medT)+card('family','ご家族・緊急連絡先',famT)+card('contacts','関係事業所・連絡先',conT)+card('training','個別機能訓練メニュー（20分）',trV)+card('dayact','デイサービスでの活動（好き・苦手・行った活動）',dayactHtml(profOf(r.id,'dayact')))+card('life','生活歴・入居前の状況',lifeV);
  $$('#baseOut [data-edit]').forEach(btn=>btn.onclick=()=>openEdit(btn.dataset.edit));
  loadStats(r.id).then(st=>{ if(P.rid===r.id&&$('#bStats')) $('#bStats').innerHTML=statsHtml(st); });
}
function trainingView(t,r,forPrint){
  const v=t.vitals||{}; const menu=(t.menu||[]);
  return `<div class="tr-sum">${nl(t.summary||'')}</div>
  ${t.caution?`<div class="muted" style="margin:3px 0">特に気をつけること：${esc(t.caution)}</div>`:''}
  <div class="tr-h">ふだんのバイタル</div><table class="grid"><tr><th>体温</th><th>血圧（上／下）</th><th>脈拍</th><th>SpO2</th><th>体重</th></tr><tr><td>${nl(v.temp||'—')}</td><td>${nl(v.bp||'—')}</td><td>${nl(v.pulse||'—')}</td><td>${nl(v.spo2||'—')}</td><td>${nl(v.weight||'—')}</td></tr></table>
  ${t.vitalsNote?`<div class="tr-note">※ ${nl(t.vitalsNote)}</div>`:''}
  ${(t.history||[]).length?`<div class="tr-h">これまで行ってきた内容</div><ul class="tr-ul">${t.history.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  <div class="tr-h">20分メニュー</div><table class="grid tr-menu"><tr><th style="width:44px">時間</th><th>やること</th><th style="width:34%">回数の目安</th></tr>${menu.map(m=>`<tr><td>${esc(m.t)}</td><td class="l" style="white-space:normal">${nl(m.what)}</td><td class="l" style="white-space:normal">${nl(m.count)}</td></tr>`).join('')}</table>
  <div class="tr-2col">${(t.rules||[]).length?`<div class="tr-box"><b>必ず守ること</b><ul class="tr-ul">${t.rules.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}${(t.stop||[]).length?`<div class="tr-box stop"><b>すぐ中止して看護師へ</b><ul class="tr-ul">${t.stop.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</div>
  ${t.note?`<div class="tr-note">※ ${nl(t.note)}</div>`:''}
  <div class="muted" style="margin-top:4px">${esc((TRAIN_SEED.cover||{}).record||'記録：カイポケの「機能訓練」に、実施○／×・時間・内容・様子を入力。')}</div>`;
}

// ---------- 編集フォーム ----------
const inp=(k,v,ph,type)=>`<label class="muted" style="display:block">${k}<input type="${type||'text'}" data-k="${k}" value="${esc(v==null?'':v)}" placeholder="${esc(ph||'')}"></label>`;
const ta=(k,v,ph,h)=>`<label class="muted" style="display:block">${k}<textarea data-k="${k}" placeholder="${esc(ph||'')}" style="min-height:${h||64}px">${esc(v==null?'':v)}</textarea></label>`;
function grid(cols){ return `<div class="mform">${cols.join('')}</div>`; }
function openEdit(id){
  const r=cur(); const box=$(`#bc-${id} .bform`); const view=$(`#bc-${id} .bview`); let h='';
  const b=profOf(r.id,'basic')||{};
  if(id==='basic'){ h=grid([inp('ふりがな',r['ふりがな']),`<label class="muted">性別<select data-k="性別"><option value="">—</option><option ${b.sex==='男'?'selected':''}>男</option><option ${b.sex==='女'?'selected':''}>女</option></select></label>`,inp('生年月日',b.birth,'','date'),inp('入居日',r['入居日'],'','date'),inp('要介護度',b.careLevel,'要介護2 など'),inp('認定期間（開始）',b.certFrom,'','date'),inp('認定期間（終了）',b.certTo,'','date'),inp('被保険者番号',b.insuredNo),inp('医療保険',b.medical,'後期高齢者 など'),inp('食事形態',r['食事形態']),inp('本人電話',b.tel),inp('メモ',r['メモ'])]); }
  else if(id==='disease'){ const dis=profOf(r.id,'diseases')||[]; h=ta('既往歴（要約・一覧や今日の画面に出る短い文）',r['既往歴'],'例：高血圧、糖尿病、腰椎圧迫骨折（R6）',50)+`<div style="margin-top:6px"><b>既往・現病の一覧</b></div><div class="scroll"><table class="grid" id="disRows"><tr><th>区分</th><th>傷病名</th><th>病院</th><th>医師</th><th>科</th><th>電話</th><th>受診</th><th></th></tr>${dis.map(disRow).join('')}</table></div><button class="btn" type="button" id="disAdd">＋ 行を追加</button>`+ta('特記事項',b.special,'',50)+'<div class="muted">主治医は「関係事業所・連絡先」の種別「主治医・病院」で登録します（往診の曜日などはメモへ）。</div>'; }
  else if(id==='vital'){ const bath=profOf(r.id,'bath')||{}; h=`<div class="muted" style="margin-bottom:4px">入浴OKの目安（範囲を外れたら看護師へ確認）　<button class="btn" type="button" id="bathSuggest" style="padding:4px 10px">平均から提案</button></div>`+grid([inp('体温 上限（℃）',bath.tempMax,'37.5','number'),inp('血圧上 下限',bath.sbpMin,'','number'),inp('血圧上 上限',bath.sbpMax,'','number'),inp('血圧下 上限',bath.dbpMax,'','number'),inp('脈拍 下限',bath.pulseMin,'','number'),inp('脈拍 上限',bath.pulseMax,'','number'),inp('SpO2 下限（%）',bath.spo2Min,'','number')])+ta('メモ（この方の注意点）',bath.note,'例：普段から血圧が低い方。数値だけでなくふらつきの有無で判断',50); }
  else if(id==='meds'){ const m=profOf(r.id,'meds')||{times:{}}; h=`<label class="muted">管理方法<select data-k="管理"><option value="">—</option>${['自己管理','一包化・自己管理','ハウスで預かり・声かけ','ハウスで預かり・手渡し','訪看が管理','家族が管理'].map(x=>`<option ${m.manage===x?'selected':''}>${x}</option>`).join('')}</select></label>`+grid(TIMES.map(t=>ta(t,(m.times||{})[t],'薬名や「ヘルパー声かけ」など',56)))+ta('注意点',m.note,'例：朝食後薬の飲み忘れが多い。訪問したヘルパーが確認',50); }
  else if(id==='family'){ const fam=profOf(r.id,'family')||[]; h=`<div class="scroll"><table class="grid" id="famRows"><tr><th>氏名</th><th>続柄</th><th>年齢</th><th>同別居</th><th>電話</th><th>住所・メモ</th><th>緊急</th><th></th></tr>${fam.map(famRow).join('')}</table></div><button class="btn" type="button" id="famAdd">＋ 行を追加</button>`; }
  else if(id==='contacts'){ h=`<div id="cRows2">${contactsOf(r.id).map(contactRow).join('')}</div><button class="btn" type="button" id="cAdd2">＋ 関係先を追加</button>`; }
  else if(id==='training'){ const t=trainingOf(r)||{vitals:{},menu:[],history:[],rules:[],stop:[]}; const v=t.vitals||{}; h=ta('この方の概要（1〜2文）',t.summary,'例：パーキンソン病／要介護2。T字杖で歩行（見守り〜軽介助）',50)+inp('特に気をつけること（表紙の一覧に出る短い語）',t.caution,'例：血圧が低い・転倒歴あり')+`<div style="margin-top:6px"><b>ふだんのバイタル</b>　<button class="btn" type="button" id="trFromStats" style="padding:4px 10px">集計値から入れる</button></div>`+grid([inp('体温',v.temp),inp('血圧（上／下）',v.bp),inp('脈拍',v.pulse),inp('SpO2',v.spo2),inp('体重',v.weight)])+ta('バイタルの注意書き',t.vitalsNote,'',50)+ta('これまで行ってきた内容（1行1項目）',(t.history||[]).join('\n'),'',80)+`<div style="margin-top:6px"><b>20分メニュー</b></div><div class="scroll"><table class="grid" id="menuRows"><tr><th style="width:60px">時間</th><th>やること</th><th>回数の目安</th><th></th></tr>${(t.menu||[]).map(menuRow).join('')}</table></div><button class="btn" type="button" id="menuAdd">＋ 行を追加</button>`+ta('必ず守ること（1行1項目）',(t.rules||[]).join('\n'),'',90)+ta('すぐ中止して看護師へ（1行1項目）',(t.stop||[]).join('\n'),'',70)+ta('補足（計画書の状況など）',t.note,'',40); }
  else if(id==='life'){ h=ta('生活歴（職業・家庭・趣味など）',b.life,'',90)+ta('入居前の生活・介護の状況',b.current,'',90); }
  else if(id==='dayact'){ const a=profOf(r.id,'dayact')||{}; const log=(a.log||[]).slice().sort((x,y)=>(y.date||'').localeCompare(x.date||'')); h=grid([ta('好きな活動（得意・楽しめること）',a.likes,'例：歌、園芸、計算ドリル',60),ta('苦手な活動（嫌がる・避けたいこと）',a.dislikes,'例：大人数のレク、細かい手作業',60)])+`<div style="margin-top:6px"><b>行った活動</b>（日付・活動・様子）</div><div class="scroll"><table class="grid" id="dayactRows"><tr><th>日付</th><th>活動</th><th>様子・メモ</th><th></th></tr>${log.map(dayactRow).join('')}</table></div><button class="btn" type="button" id="dayactAdd">＋ 行を追加（今日）</button>`; }
  box.innerHTML=h+`<div class="row" style="margin-top:8px"><button class="btn" data-cancel>やめる</button><button class="btn pri" data-save>保存</button></div>`;
  box.classList.remove('hide'); view.classList.add('hide');
  box.querySelector('[data-cancel]').onclick=()=>{ box.classList.add('hide'); view.classList.remove('hide'); };
  box.querySelector('[data-save]').onclick=()=>saveEdit(id,box);
  const rowAdd=(btn,tbl,fn)=>{ const b=box.querySelector(btn); if(b) b.onclick=()=>box.querySelector(tbl).insertAdjacentHTML('beforeend',fn({})); };
  rowAdd('#disAdd','#disRows',disRow); rowAdd('#famAdd','#famRows',famRow); rowAdd('#menuAdd','#menuRows',menuRow);
  const da=box.querySelector('#dayactAdd'); if(da) da.onclick=()=>{ box.querySelector('#dayactRows').rows[0].insertAdjacentHTML('afterend',dayactRow({date:todayStr()})); };
  box.addEventListener('click',e=>{ if(e.target.classList.contains('rDel')) e.target.closest('tr').remove(); if(e.target.classList.contains('cDel')) e.target.closest('.crow').remove(); });
  const c2=box.querySelector('#cAdd2'); if(c2) c2.onclick=()=>box.querySelector('#cRows2').insertAdjacentHTML('beforeend',contactRow());
  const bs=box.querySelector('#bathSuggest'); if(bs) bs.onclick=async()=>{ const st=await loadStats(r.id); const s=suggestBath(st); if(!Object.keys(s).length) return toast('集計できるバイタル記録がありません'); const map={'体温 上限（℃）':'tempMax','血圧上 下限':'sbpMin','血圧上 上限':'sbpMax','血圧下 上限':'dbpMax','脈拍 下限':'pulseMin','脈拍 上限':'pulseMax','SpO2 下限（%）':'spo2Min'}; box.querySelectorAll('[data-k]').forEach(el=>{ const k=map[el.dataset.k]; if(k&&s[k]!=null) el.value=s[k]; }); toast('平均±の目安を入れました。必要なら直して保存してください'); };
  const tf=box.querySelector('#trFromStats'); if(tf) tf.onclick=async()=>{ const st=await loadStats(r.id); if(!st.n) return toast('集計できるバイタル記録がありません'); const set=(k,v)=>{ const el=box.querySelector(`[data-k="${k}"]`); if(el&&v) el.value=v; }; if(st.temp) set('体温',`${f1(st.temp.p10)}〜${f1(st.temp.p90)}℃`); if(st.sbp) set('血圧（上／下）',`${f0(st.sbp.avg)}／${st.dbp?f0(st.dbp.avg):'—'} 前後（上は${f0(st.sbp.min)}〜${f0(st.sbp.max)}）`); if(st.pulse) set('脈拍',`${f0(st.pulse.p10)}〜${f0(st.pulse.p90)}`); if(st.spo2) set('SpO2',`${f0(st.spo2.p10)}〜${f0(st.spo2.p90)}%`); if(st.weight) set('体重',`${f1(st.weight.min)}〜${f1(st.weight.max)}kg`); };
  box.scrollIntoView({behavior:'smooth',block:'start'});
}
const disRow=d=>`<tr><td><select data-k="type"><option ${d.type==='既往'?'selected':''}>既往</option><option ${d.type==='現病'?'selected':''}>現病</option></select></td><td><input data-k="name" value="${esc(d.name||'')}" style="min-width:140px"></td><td><input data-k="hospital" value="${esc(d.hospital||'')}" style="min-width:110px"></td><td><input data-k="doctor" value="${esc(d.doctor||'')}" style="width:80px"></td><td><input data-k="dept" value="${esc(d.dept||'')}" style="width:70px"></td><td><input data-k="tel" value="${esc(d.tel||'')}" style="width:110px"></td><td><select data-k="status"><option value="">—</option>${['通院','往診','入院中','治療終了','経過観察'].map(x=>`<option ${d.status===x?'selected':''}>${x}</option>`).join('')}</select></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>`;
const famRow=f=>`<tr><td><input data-k="name" value="${esc(f.name||'')}" style="min-width:100px"></td><td><input data-k="rel" value="${esc(f.rel||'')}" style="width:70px"></td><td><input data-k="age" value="${esc(f.age||'')}" style="width:44px"></td><td><select data-k="live"><option value="">—</option><option ${f.live==='同居'?'selected':''}>同居</option><option ${f.live==='別居'?'selected':''}>別居</option></select></td><td><input data-k="tel" value="${esc(f.tel||'')}" style="width:120px"></td><td><input data-k="addr" value="${esc([f.addr,f.note].filter(Boolean).join(' ')||'')}" style="min-width:140px"></td><td><input type="checkbox" data-k="emergency" ${f.emergency?'checked':''}></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>`;
const menuRow=m=>`<tr><td><input data-k="t" value="${esc(m.t||'')}" style="width:56px"></td><td><textarea data-k="what" style="min-height:40px;min-width:160px">${esc(m.what||'')}</textarea></td><td><textarea data-k="count" style="min-height:40px;min-width:120px">${esc(m.count||'')}</textarea></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>`;
const val=(box,k)=>{ const el=box.querySelector(`[data-k="${k}"]`); return el?el.value.trim():''; };
const rowsOf=(box,sel)=>[...box.querySelectorAll(sel+' tr')].slice(1).map(tr=>{ const o={}; tr.querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.type==='checkbox'?el.checked:el.value.trim()); return o; });
async function saveEdit(id,box){
  const r=cur(); try{ busy(true);
    if(id==='basic'){ const b=profOf(r.id,'basic')||{}; Object.assign(b,{sex:val(box,'性別'),birth:val(box,'生年月日'),careLevel:val(box,'要介護度'),certFrom:val(box,'認定期間（開始）'),certTo:val(box,'認定期間（終了）'),insuredNo:val(box,'被保険者番号'),medical:val(box,'医療保険'),tel:val(box,'本人電話')}); await saveProf(r.id,'basic',b);
      const upd=await api('updateResident',{id:r.id,'ふりがな':val(box,'ふりがな'),'入居日':val(box,'入居日'),'食事形態':val(box,'食事形態'),'メモ':val(box,'メモ')}); applyRes(r.id,upd); }
    else if(id==='disease'){ const b=profOf(r.id,'basic')||{}; b.special=val(box,'特記事項'); await saveProf(r.id,'basic',b); await saveProf(r.id,'diseases',rowsOf(box,'#disRows').filter(d=>d.name||d.hospital)); const upd=await api('updateResident',{id:r.id,'既往歴':val(box,'既往歴（要約・一覧や今日の画面に出る短い文）')}); applyRes(r.id,upd); }
    else if(id==='vital'){ const g=k=>val(box,k); await saveProf(r.id,'bath',{tempMax:g('体温 上限（℃）'),sbpMin:g('血圧上 下限'),sbpMax:g('血圧上 上限'),dbpMax:g('血圧下 上限'),pulseMin:g('脈拍 下限'),pulseMax:g('脈拍 上限'),spo2Min:g('SpO2 下限（%）'),note:g('メモ（この方の注意点）')}); }
    else if(id==='meds'){ const times={}; TIMES.forEach(t=>times[t]=val(box,t)); await saveProf(r.id,'meds',{manage:val(box,'管理'),times,note:val(box,'注意点')}); }
    else if(id==='dayact'){ await saveProf(r.id,'dayact',{likes:val(box,'好きな活動（得意・楽しめること）'),dislikes:val(box,'苦手な活動（嫌がる・避けたいこと）'),log:rowsOf(box,'#dayactRows').filter(x=>x.act||x.note).map(x=>({date:x.date,act:x.act,note:x.note}))}); }
    else if(id==='family'){ await saveProf(r.id,'family',rowsOf(box,'#famRows').filter(f=>f.name).map(f=>({name:f.name,rel:f.rel,age:f.age,live:f.live,tel:f.tel,addr:f.addr,note:'',emergency:!!f.emergency}))); }
    else if(id==='contacts'){ const rows=[...box.querySelectorAll('.crow')].map(row=>{ const o={'氏名':r['氏名']}; row.querySelectorAll('[data-k]').forEach(el=>o[el.dataset.k]=el.value.trim()); return o; }).filter(o=>o['事業所']||o['担当者']||o['連絡先']); const saved=await api('saveContacts',{residentId:r.id,rows}); D.contacts=D.contacts.filter(c=>c['利用者ID']!==r.id).concat(saved); }
    else if(id==='training'){ const t={summary:val(box,'この方の概要（1〜2文）'),caution:val(box,'特に気をつけること（表紙の一覧に出る短い語）'),vitals:{temp:val(box,'体温'),bp:val(box,'血圧（上／下）'),pulse:val(box,'脈拍'),spo2:val(box,'SpO2'),weight:val(box,'体重')},vitalsNote:val(box,'バイタルの注意書き'),history:lines(val(box,'これまで行ってきた内容（1行1項目）')),menu:rowsOf(box,'#menuRows').filter(m=>m.what),rules:lines(val(box,'必ず守ること（1行1項目）')),stop:lines(val(box,'すぐ中止して看護師へ（1行1項目）')),note:val(box,'補足（計画書の状況など）')}; await saveProf(r.id,'training',t); }
    else if(id==='life'){ const b=profOf(r.id,'basic')||{}; b.life=val(box,'生活歴（職業・家庭・趣味など）'); b.current=val(box,'入居前の生活・介護の状況'); await saveProf(r.id,'basic',b); }
    toast('保存しました'); renderBase(); if(typeof renderResTable==='function') renderResTable();
  }catch(e){ toast('失敗: '+e.message); } finally{ busy(false); }
}
function applyRes(rid,upd){ const i=D.allResidents.findIndex(x=>x.id===rid); if(i>=0) Object.assign(D.allResidents[i],upd); const j=D.residents.findIndex(x=>x.id===rid); if(j>=0) Object.assign(D.residents[j],upd); if(D.cur&&D.cur.id===rid) Object.assign(D.cur,upd); }

// ---------- アセスメントPDF取込 ----------
async function importAssessment(file){
  const st=$('#asStatus'); st.textContent='読み取り中…';
  try{ busy(true);
    await window.ensurePdf(); const doc=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; const a=await parseAssessmentPdf(doc);
    if(!a.name) throw new Error('アセスメントシートとして読み取れませんでした');
    let r=D.allResidents.find(x=>normName(x['氏名'])===normName(a.name));
    if(!r){ r=cur(); if(!confirm(`PDFの氏名「${a.name}」に一致する入居者がいません。選択中の ${r['氏名']} 様に取り込みますか？`)) { st.textContent='中止しました'; return; } }
    else if(r.id!==P.rid){ P.rid=r.id; $('#bRes').value=r.id; }
    const b=profOf(r.id,'basic')||{}; const nb={...b}; ['sex','birth','tel','life','current','special'].forEach(k=>{ if(a[k]) nb[k]=a[k]; }); if(a.care.level) nb.careLevel=a.care.level; if(a.care.from){ nb.certFrom=a.care.from; nb.certTo=a.care.to; } if(a.care.insuredNo) nb.insuredNo=a.care.insuredNo; if(a.care.medical) nb.medical=a.care.medical;
    const items=[{residentId:r.id,key:'basic',value:nb}];
    if(a.family.length) items.push({residentId:r.id,key:'family',value:a.family});
    if(a.diseases.length) items.push({residentId:r.id,key:'diseases',value:a.diseases});
    if(a.meds){ const m=profOf(r.id,'meds')||{times:{}}; if(!m.note) { m.note=a.meds; items.push({residentId:r.id,key:'meds',value:m}); } }
    const summary=[`氏名：${a.name}（${a.kana}）`,a.birth?`生年月日：${wareki(a.birth)}（${a.age}歳）`:'',a.care.level?`要介護度：${a.care.level}　認定期間：${fmtD(a.care.from)}〜${fmtD(a.care.to)}`:'',`家族・緊急連絡先：${a.family.length}件`,`既往・現病：${a.diseases.length}件（${a.diseases.map(d=>d.name).join('、')}）`,`利用サービス：${a.services.map(s=>s.kind+' '+s.office).join('、')}`].filter(Boolean).join('\n');
    if(!confirm(`次の内容を ${r['氏名']} 様の基本情報に取り込みます（同じ項目は上書き）。よろしいですか？\n\n${summary}`)) { st.textContent='中止しました'; return; }
    await api('saveProfile',{items}); D.profiles=D.profiles.filter(p=>!(p['利用者ID']===r.id&&items.some(it=>it.key===p['キー']))); items.forEach(it=>D.profiles.push({'利用者ID':r.id,'キー':it.key,'値':JSON.stringify(it.value)}));
    // 関係先：利用サービス＋主治医（同じ事業所名が既にあれば追加しない）
    const KMAP={'居宅介護支援':'ケアマネ','訪問看護':'訪問看護','訪問介護':'訪問介護','通所介護':'デイ','地域密着型通所介護':'デイ','通所リハ':'デイ','福祉用具貸与':'福祉用具','特定福祉用具':'福祉用具','居宅療養管理':'薬局'};
    const cs=contactsOf(r.id).map(c=>({...c})); const has=n=>cs.some(c=>normName(c['事業所'])===normName(n)); let added=0;
    for(const s of a.services){ if(!s.office||has(s.office)) continue; cs.push({'氏名':r['氏名'],'種別':KMAP[s.kind]||'行政・その他','事業所':s.office,'担当者':'','連絡先':'','メモ':s.kind}); added++; }
    for(const d of a.diseases){ if(d.type!=='現病'||!d.hospital||has(d.hospital)) continue; cs.push({'氏名':r['氏名'],'種別':'主治医・病院','事業所':d.hospital,'担当者':d.doctor||'','連絡先':d.tel||'','メモ':[d.dept,d.status,d.name].filter(Boolean).join('・')}); added++; }
    if(added){ const saved=await api('saveContacts',{residentId:r.id,rows:cs}); D.contacts=D.contacts.filter(c=>c['利用者ID']!==r.id).concat(saved); }
    if(!r['既往歴']&&a.diseases.length){ const upd=await api('updateResident',{id:r.id,'既往歴':a.diseases.map(d=>d.name.replace(/^\d{4}[\/年]\d*[\/月]?\d*日?に?/,'').trim()).join('、').slice(0,120)}); applyRes(r.id,upd); }
    st.textContent=`${r['氏名']} 様に取り込みました（関係先 ${added}件追加）`; renderBase();
  }catch(e){ st.textContent='エラー: '+e.message; console.error(e); } finally{ busy(false); }
}

// ---------- 印刷 ----------
function printHtml(html, portrait){
  let area=$('#printArea'); if(!area){ area=document.createElement('div'); area.id='printArea'; document.querySelector('main').appendChild(area); }
  area.innerHTML=html; const st=document.createElement('style'); st.id='printPage'; st.textContent=`@page{size:A4 ${portrait?'portrait':'landscape'};margin:10mm}`; document.head.appendChild(st);
  document.body.classList.add('print-base'); window.print();
  setTimeout(()=>{ document.body.classList.remove('print-base'); st.remove(); area.innerHTML=''; },500);
}
function sheetHtml(r,st){
  const b=profOf(r.id,'basic')||{}; const fam=profOf(r.id,'family')||[]; const meds=profOf(r.id,'meds')||{times:{}}; const dis=profOf(r.id,'diseases')||[]; const bath=profOf(r.id,'bath')||{}; const cs=contactsOf(r.id); const age=ageFromBirth(b.birth);
  const kv=(k,v)=>`<tr><th>${k}</th><td>${v||''}</td></tr>`;
  return `<div class="psheet"><div class="ph"><span class="pt">利用者基本シート</span><span class="pn">${r["部屋"]?esc(r["部屋"])+"号室　":""}${esc(r['氏名'])} 様${r['ふりがな']?`（${esc(r['ふりがな'])}）`:''}</span><span class="pd">${new Date().toLocaleDateString('ja-JP')} 現在</span></div>
  <div class="p2">
   <div><h3>基本情報</h3><table class="grid kv">${kv('性別／生年月日',`${esc(b.sex||'')}　${b.birth?esc(wareki(b.birth))+`（${age}歳）`:''}`)}${kv('入居日',r['入居日']?fmtD(r['入居日'])+'（'+ageOf(r['入居日'])+'）':'')}${kv('要介護度／認定期間',`${esc(b.careLevel||'')}　${b.certFrom?fmtD(b.certFrom)+'〜'+fmtD(b.certTo):''}`)}${kv('被保険者番号／医療保険',`${esc(b.insuredNo||'')}　${esc(b.medical||'')}`)}${kv('食事形態',esc(r['食事形態']||''))}${kv('本人電話',esc(b.tel||''))}</table>
    <h3>既往歴・現病</h3>${r['既往歴']?`<div>${esc(r['既往歴'])}</div>`:''}${dis.length?`<table class="grid"><tr><th></th><th>傷病名</th><th>病院・医師</th><th>科</th><th>受診</th></tr>${dis.map(d=>`<tr><td>${esc(d.type)}</td><td class="l" style="white-space:normal">${esc(d.name)}</td><td class="l">${esc(d.hospital)}${d.doctor?' '+esc(d.doctor):''}${d.tel?'<br>'+esc(d.tel):''}</td><td>${esc(d.dept)}</td><td>${esc(d.status)}</td></tr>`).join('')}</table>`:''}${b.special?`<div class="small">特記：${nl(b.special)}</div>`:''}
    <h3>ふだんのバイタル・入浴の目安</h3>${statsHtml(st)}<div style="margin-top:3px">${bathHtml(bath)}</div>
    <h3>服薬</h3><table class="grid"><tr>${TIMES.map(t=>`<th>${t}</th>`).join('')}</tr><tr>${TIMES.map(t=>`<td class="l" style="white-space:normal;vertical-align:top">${nl((meds.times||{})[t]||'')}</td>`).join('')}</tr></table><div class="small">管理：${esc(meds.manage||'')}${meds.note?'　'+nl(meds.note):''}</div>
   </div>
   <div><h3>ご家族・緊急連絡先</h3>${fam.length?`<table class="grid"><tr><th>氏名</th><th>続柄</th><th>同別居</th><th>電話</th><th>緊急</th></tr>${fam.map(f=>`<tr><td class="l">${esc(f.name)}</td><td>${esc(f.rel)}</td><td>${esc(f.live)}</td><td>${esc(f.tel)}</td><td>${f.emergency?'◎':''}</td></tr>`).join('')}</table>`:'<div class="small">未登録</div>'}${fam.some(f=>f.addr)?`<div class="small">${fam.filter(f=>f.addr).map(f=>esc(f.name)+'：'+esc(f.addr)).join('<br>')}</div>`:''}
    <h3>関係事業所・主治医・連絡先</h3>${cs.length?`<table class="grid"><tr><th>種別</th><th>事業所</th><th>担当者</th><th>連絡先</th></tr>${cs.map(c=>`<tr><td>${esc(c['種別'])}</td><td class="l" style="white-space:normal">${esc(c['事業所'])}${c['メモ']?'<br><small>'+esc(c['メモ'])+'</small>':''}</td><td>${esc(c['担当者'])}</td><td>${esc(c['連絡先'])}</td></tr>`).join('')}</table>`:'<div class="small">未登録</div>'}
    ${b.life?`<h3>生活歴</h3><div class="small">${nl(b.life)}</div>`:''}${b.current?`<h3>入居前の生活・介護の状況</h3><div class="small">${nl(b.current)}</div>`:''}${profOf(r.id,'dayplan')&&profOf(r.id,'dayplan').plan?`<h3>通所介護計画書より</h3><div class="small">${dayplanHtml(profOf(r.id,'dayplan'),true)}</div>`:''}
   </div>
  </div></div>`;
}
function trainPage(r){ const t=trainingOf(r); if(!t) return ''; return `<div class="psheet tr"><div class="ph"><span class="pt">アロハデイサービス　個別機能訓練（20分）</span><span class="pn">${esc(r['氏名'])} 様${r['ふりがな']?`（${esc(r['ふりがな'])}）`:''}</span></div>${trainingView(t,r,true)}</div>`; }
function coverPage(list){ const c=profOf('', 'trainCover')||TRAIN_SEED.cover||{}; return `<div class="psheet tr"><div class="ph"><span class="pt">アロハデイサービス　個別機能訓練　20分メニュー</span><span class="pn">応援スタッフ（カイテク）の方へ</span></div>
  <div class="tr-box"><b>このメニュー表の使い方</b><div>${nl(c.usage||'')}</div></div>
  <div class="tr-h">掲載している方</div><table class="grid"><tr><th>ページ</th><th>お名前</th><th>特に気をつけること</th></tr>${list.map((r,i)=>{ const t=trainingOf(r); return `<tr><td>${i+1}枚目</td><td class="l">${esc(r['氏名'])} 様</td><td class="l" style="white-space:normal">${esc((t&&t.caution)||'')}</td></tr>`; }).join('')}</table>
  <div class="tr-h">困ったときの連絡先</div><table class="grid"><tr><th>こんなとき</th><th>連絡先</th></tr>${(c.contacts||[]).map(x=>`<tr><td class="l">${esc(x.when)}</td><td class="l">${esc(x.to)}</td></tr>`).join('')}</table>
  <div class="small" style="margin-top:8px">${esc(c.footer||'')}</div></div>`; }
async function printSheet(){ const r=cur(); const st=await loadStats(r.id); printHtml(sheetHtml(r,st),true); }
function printTrain(all){ const list=(all?D.residents:[cur()]).filter(r=>trainingOf(r)); if(!list.length) return toast('機能訓練メニューが登録されている入居者がいません'); printHtml((all?coverPage(list):'')+list.map(trainPage).join(''),true); }
async function printAllSheets(){ let h=''; for(const r of D.residents){ h+=sheetHtml(r,await loadStats(r.id)); } printHtml(h,true); }

// ---------- 表紙の編集 ----------
function editCover(){ const c=profOf('', 'trainCover')||TRAIN_SEED.cover||{contacts:[]}; const box=$('#coverForm'); box.innerHTML=ta('このメニュー表の使い方',c.usage,'',90)+`<div><b>困ったときの連絡先</b></div><table class="grid" id="covRows"><tr><th>こんなとき</th><th>連絡先</th><th></th></tr>${(c.contacts||[]).map(x=>`<tr><td><input data-k="when" value="${esc(x.when)}"></td><td><input data-k="to" value="${esc(x.to)}"></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>`).join('')}</table><button class="btn" type="button" id="covAdd">＋ 行を追加</button>`+inp('フッター（事業所名・電話）',c.footer)+`<div class="row" style="margin-top:8px"><button class="btn" id="covCancel">やめる</button><button class="btn pri" id="covSave">保存</button></div>`; box.classList.remove('hide');
  $('#covAdd').onclick=()=>$('#covRows').insertAdjacentHTML('beforeend','<tr><td><input data-k="when"></td><td><input data-k="to"></td><td><button type="button" class="btn danger rDel" style="padding:2px 8px">×</button></td></tr>');
  box.onclick=e=>{ if(e.target.classList.contains('rDel')) e.target.closest('tr').remove(); };
  $('#covCancel').onclick=()=>box.classList.add('hide');
  $('#covSave').onclick=async()=>{ try{ busy(true); await saveProf('','trainCover',{usage:val(box,'このメニュー表の使い方'),contacts:rowsOf(box,'#covRows').filter(x=>x.when||x.to),footer:val(box,'フッター（事業所名・電話）'),record:(TRAIN_SEED.cover||{}).record}); box.classList.add('hide'); toast('保存しました'); }catch(e){ toast('失敗: '+e.message); } finally{ busy(false); } };
}

// ---------- 配線 ----------
window.renderBaseTab=function(){ fillRes(); renderBase(); };
$('#bRes').onchange=()=>{ P.rid=$('#bRes').value; renderBase(); };
$('#bPrintSheet').onclick=printSheet; $('#bPrintSheetAll').onclick=printAllSheets; $('#bPrintTrain').onclick=()=>printTrain(false); $('#bPrintTrainAll').onclick=()=>printTrain(true); $('#bCover').onclick=editCover;
$('#asPdf').onchange=e=>{ const f=e.target.files[0]; if(f) importAssessment(f); e.target.value=''; };
window.openBase=function(rid){ P.rid=rid; show('base'); };
})();
