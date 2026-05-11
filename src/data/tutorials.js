export const tutorials = [
  {
    id: "machine",
    title: {
      en: "Sewing Machine Basics",
      nb: "Symaskin – grunnleggende",
      zh: "縫紉機基礎",
    },
    emoji: "🪡",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "machine-1",
        title: {
          en: "Wind the Bobbin",
          nb: "Spol underspolen",
          zh: "繞底線",
        },
        description: {
          en: "Place a spool of thread on the pin. Run the thread through the bobbin winding guide and wrap a few times around an empty bobbin. Press the bobbin winder pedal until full.",
          nb: "Sett en trådsnelle på pinnen. Før tråden gjennom underspoleguiden og vikle den noen ganger rundt en tom underspole. Trykk på underspolepedalen til den er full.",
          zh: "把線軸放在線軸座上。將線穿過繞線導線器,在空梭芯上繞幾圈,踩下繞線踏板直到繞滿。",
        },
        tip: {
          en: "Wind at medium speed for even tension — too fast causes uneven winding.",
          nb: "Spol med middels hastighet for jevn tråd — for fort gir ujevn spoling.",
          zh: "用中速繞線張力才會均勻 — 太快會繞得不平整。",
        },
      },
      {
        id: "machine-2",
        title: {
          en: "Thread the Upper Thread",
          nb: "Træ overtråden",
          zh: "穿上線",
        },
        description: {
          en: "Follow the numbered thread path on your machine: spool pin → thread guides → tension discs → take-up lever → needle. Always thread with the presser foot raised.",
          nb: "Følg den nummererte trådveien på maskinen din: trådsnellepinne → trådførere → strammeskiver → trådfanger → nål. Hev alltid trykkfoten under tredning.",
          zh: "依機器上的編號穿線:線軸座 → 導線器 → 張力盤 → 挑線桿 → 機針。穿線時要把壓布腳抬起。",
        },
        tip: {
          en: "Raising the presser foot opens the tension discs so the thread seats correctly.",
          nb: "Når trykkfoten er hevet åpner strammeskivene seg slik at tråden sitter riktig.",
          zh: "抬起壓布腳會打開張力盤,線才能正確嵌入。",
        },
      },
      {
        id: "machine-3",
        title: {
          en: "Insert the Bobbin",
          nb: "Sett inn underspolen",
          zh: "裝入梭芯",
        },
        description: {
          en: "Drop the wound bobbin into the bobbin case (or slot, depending on machine type). Thread the bobbin tail through the slot and pull it under the needle plate.",
          nb: "Legg den fylte underspolen i underspolehuset (eller sporet, avhengig av maskintype). Træ enden gjennom sporet og trekk den under nåleplaten.",
          zh: "把繞好的梭芯放入梭殼(或梭芯槽,視機型而定)。把線尾穿過槽口,拉到針板下。",
        },
        tip: {
          en: "The thread should unwind counter-clockwise when the bobbin is placed correctly.",
          nb: "Tråden skal vikles av mot klokka når underspolen er riktig plassert.",
          zh: "梭芯放對時,線會以逆時針方向拉出。",
        },
      },
      {
        id: "machine-4",
        title: {
          en: "Set Stitch Length & Tension",
          nb: "Still inn stinglengde og tråd­spenning",
          zh: "設定針距與張力",
        },
        description: {
          en: "For most fabrics use stitch length 2.5–3 mm. Adjust thread tension so the stitch looks the same on both sides — if knots appear on top, loosen upper tension; if on bottom, tighten it.",
          nb: "For de fleste stoffer bruk stinglengde 2,5–3 mm. Juster trådspenningen slik at stinget ser likt ut på begge sider — knuter oppå betyr at overtråden er for stram; nederst betyr at den er for løs.",
          zh: "多數布料用針距 2.5–3 公釐。調整張力讓兩面車線一致 — 表面有結就放鬆上線張力,背面有結則收緊。",
        },
        tip: {
          en: "Always test on a scrap of the same fabric before sewing your actual pieces.",
          nb: "Test alltid på en stoffrest før du syr på selve plagget.",
          zh: "正式縫之前,先在同款布料的碎布上試縫。",
        },
      },
      {
        id: "machine-5",
        title: {
          en: "Start & End a Seam",
          nb: "Start og avslutt en søm",
          zh: "起針與收針",
        },
        description: {
          en: "Position fabric under the presser foot, lower the foot, then sew 3–4 stitches forward. Press the reverse button and backstitch over those stitches to lock. Sew forward to the end, then backstitch again to finish.",
          nb: "Plasser stoffet under trykkfoten, senk foten, og sy 3–4 sting forover. Trykk reversknappen og sy tilbake over de samme stingene for å låse. Sy fram til enden og avslutt med å sy tilbake igjen.",
          zh: "把布放到壓布腳下,壓下壓布腳,先車 3–4 針。按倒車鍵在原針距上回針鎖線,再車到底,結束時再回針一次。",
        },
        tip: {
          en: "Keep your hands lightly guiding the fabric — don't push or pull, just steer.",
          nb: "La hendene lett styre stoffet — ikke skyv eller dra, bare før det.",
          zh: "雙手只輕輕引導布料 — 不要推也不要拉,只控制方向。",
        },
      },
    ],
  },
  {
    id: "stitches",
    title: {
      en: "Basic Stitch Types",
      nb: "Grunnleggende stingtyper",
      zh: "基本縫法",
    },
    emoji: "🧶",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "stitches-1",
        title: { en: "Straight Stitch", nb: "Rettsting", zh: "直線縫" },
        description: {
          en: "The most common machine stitch — a single line of even stitches used for seams. Set stitch length to 2.5 mm for medium-weight fabric, shorter for delicate, longer for basting.",
          nb: "Det vanligste maskinstinget — en enkelt linje med jevne sting brukt til sømmer. Sett stinglengde til 2,5 mm for middels stoff, kortere for sarte, lengre for tråkling.",
          zh: "最常見的機縫法 — 一條均勻直線,用於縫合接縫。中等布料設 2.5 公釐,薄料更短,假縫更長。",
        },
        tip: {
          en: "Use a seam guide or tape on the needle plate to keep consistent seam allowance.",
          nb: "Bruk sømføring eller teip på nåleplaten for å holde jevn sømmonn.",
          zh: "用針板上的縫份導引或膠帶,保持縫份一致。",
        },
      },
      {
        id: "stitches-2",
        title: {
          en: "Backstitch (Hand)",
          nb: "Tilbake­sting (hånd)",
          zh: "回針縫(手縫)",
        },
        description: {
          en: "Bring needle up, then insert it one stitch-length behind and bring it up one stitch-length ahead. Each stitch goes back to meet the previous one, creating a solid line. Very strong for hand-sewn seams.",
          nb: "Stikk nålen opp, før den ned ett sting bak, og opp ett sting framme. Hvert sting går tilbake og møter det forrige, så det dannes en sammenhengende linje. Veldig sterkt for håndsyet sømmer.",
          zh: "把針自布面穿出,再往後一個針距入針,從前方一個針距出針。每一針回去接前一針,形成連續實線,手縫接縫非常牢固。",
        },
        tip: {
          en: "Backstitch is great for repairing seams by hand — stronger than a running stitch.",
          nb: "Tilbakesting er flott for å reparere sømmer for hånd — sterkere enn løpesting.",
          zh: "回針縫修補手縫接縫很好用 — 比平針縫更牢固。",
        },
      },
      {
        id: "stitches-3",
        title: {
          en: "Running / Basting Stitch",
          nb: "Løpesting / tråkling",
          zh: "平針縫 / 假縫",
        },
        description: {
          en: "Weave the needle in and out of the fabric at regular intervals. Long stitches (6–8 mm) are basting — temporary holds before permanent stitching. Short stitches (2–3 mm) are a permanent running stitch.",
          nb: "Vev nålen inn og ut av stoffet med jevne mellomrom. Lange sting (6–8 mm) er tråkling — midlertidig holdning før permanent søm. Korte sting (2–3 mm) er permanent løpesting.",
          zh: "讓針有規律地上下穿入布料。長針距(6–8 公釐)為假縫,正式縫前的暫時固定;短針距(2–3 公釐)為永久平針縫。",
        },
        tip: {
          en: "Use a contrasting thread color for basting so it's easy to spot and remove later.",
          nb: "Bruk kontrastfarge på trådet ved tråkling så det er lett å se og fjerne senere.",
          zh: "假縫用對比色線,之後比較容易辨識與拆除。",
        },
      },
      {
        id: "stitches-4",
        title: {
          en: "Zigzag Stitch",
          nb: "Sikksakksting",
          zh: "Z 字縫",
        },
        description: {
          en: "A machine stitch that moves side to side, used to finish raw edges and prevent fraying. Set width to 3–4 mm and length to 2.5 mm. Stitch along the raw edge so the zigzag just catches the edge.",
          nb: "Et maskinsting som beveger seg fra side til side, brukt til å renske rå kanter og hindre frynsing. Sett bredden til 3–4 mm og lengden til 2,5 mm. Sy langs den rå kanten slik at sikksakk akkurat treffer kanten.",
          zh: "機器左右擺動形成的鋸齒縫,用來收邊防止鬆邊。寬度 3–4 公釐、針距 2.5 公釐,沿布邊縫,讓鋸齒剛好咬住邊緣。",
        },
        tip: {
          en: "Zigzag stitch is essential if you don't have a serger/overlocker.",
          nb: "Sikksakksting er essensielt hvis du ikke har overlock.",
          zh: "若沒有拷克機,Z 字縫就是必備收邊縫法。",
        },
      },
      {
        id: "stitches-5",
        title: {
          en: "Slip Stitch (Invisible)",
          nb: "Skjult sting",
          zh: "藏針縫",
        },
        description: {
          en: "Used to close openings invisibly from the outside. Fold both edges in, then pick up a tiny bit of each fold alternately, pulling thread gently to close the gap. The thread travels inside the fold and is invisible.",
          nb: "Brukes for å lukke åpninger usynlig fra utsiden. Brett begge kantene inn, og ta opp litt av hver brett vekselvis. Trekk forsiktig i tråden for å lukke åpningen. Tråden går inne i bretten og er usynlig.",
          zh: "用來從外側看不見地縫合開口。兩邊摺邊,輪流挑起摺邊內側一點點布,輕輕拉線使開口閉合,線藏在摺內,外觀看不見。",
        },
        tip: {
          en: "Perfect for closing the turning gap on bag handles, pillow covers, or hemming.",
          nb: "Perfekt for å lukke vendeåpningen på baghåndtak, putetrekk eller faldsøm.",
          zh: "適合用來收提袋翻口、抱枕套或衣襬下襬。",
        },
      },
    ],
  },
  {
    id: "button",
    title: {
      en: "Sewing a Button",
      nb: "Sy fast en knapp",
      zh: "縫釦子",
    },
    emoji: "🔵",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    steps: [
      {
        id: "button-1",
        title: {
          en: "Mark the Position",
          nb: "Merk plasseringen",
          zh: "標記位置",
        },
        description: {
          en: "Mark the button placement with a pin or chalk. For accuracy, first sew the buttonhole, then overlap the placards and mark through the center of the hole.",
          nb: "Merk knappens plassering med en knappenål eller kritt. For nøyaktighet sy først knapphullet, så legg knappestolpene over hverandre og merk gjennom midten av hullet.",
          zh: "用別針或粉筆標記釦子位置。為求精準,先車釦眼,再把襟前重疊,從釦眼中央標記釦位。",
        },
        tip: {
          en: "Always sew the buttonhole first, then use it to determine exact button placement.",
          nb: "Sy alltid knapphullet først, og bruk det til å bestemme nøyaktig knappe­plassering.",
          zh: "永遠先做釦眼,再以釦眼決定釦子的精確位置。",
        },
      },
      {
        id: "button-2",
        title: {
          en: "Prepare the Thread",
          nb: "Klargjør tråden",
          zh: "準備縫線",
        },
        description: {
          en: "Cut ~50 cm of strong thread (buttonhole or doubled regular thread). Thread the needle and knot the end with a double knot. Bring it up from the wrong side at the marked point.",
          nb: "Klipp ca. 50 cm sterk tråd (knapphulltråd eller dobbel vanlig tråd). Træ nålen og knytt enden med en dobbel knute. Stikk opp fra vrangsiden på det merkede punktet.",
          zh: "剪約 50 公分強韌的線(釦眼線或一般線雙股),穿針後尾端打雙結,從反面在標記點處出針。",
        },
        tip: {
          en: "Wax the thread by running it over beeswax or a candle to prevent tangling and add strength.",
          nb: "Vokse tråden ved å dra den over bivoks eller et stearinlys — dette hindrer floker og styrker tråden.",
          zh: "把線過一下蜂蠟或蠟燭,可防打結並增加強度。",
        },
      },
      {
        id: "button-3",
        title: {
          en: "Stitch Through the Holes",
          nb: "Sy gjennom hullene",
          zh: "穿過釦孔縫合",
        },
        description: {
          en: 'Place a toothpick or pin under the button to create slack (the "shank"). Stitch up through one hole and down through the opposite hole 4–6 times per pair. Repeat for all hole pairs.',
          nb: "Legg en tannpirker eller knappenål under knappen for å skape mellomrom («halsen»). Sy opp gjennom ett hull og ned gjennom det motsatte 4–6 ganger per par. Gjenta for alle hullpar.",
          zh: "在釦子下放一根牙籤或別針製造線腳鬆度。從一個孔上來、對角孔下去,每對縫 4–6 次,所有孔對都重複。",
        },
        tip: {
          en: "Keep the button slightly raised from the fabric while stitching — this allows room for the fabric layers to close.",
          nb: "Hold knappen litt over stoffet mens du syr — det gir plass til at stofflagene kan lukke seg.",
          zh: "縫的時候讓釦子稍微離開布面 — 才有空間給布層扣合。",
        },
      },
      {
        id: "button-4",
        title: {
          en: "Create the Thread Shank",
          nb: "Lag trådhalsen",
          zh: "做線腳",
        },
        description: {
          en: "Remove the toothpick. Lift the button up so the threads between button and fabric are visible. Wrap the working thread around these threads 5–7 times to form a firm shank.",
          nb: "Fjern tannpirkeren. Løft knappen opp så trådene mellom knappen og stoffet blir synlige. Vikle tråden rundt disse 5–7 ganger for å danne en fast hals.",
          zh: "拿掉牙籤,把釦子拉起,露出釦子與布之間的縫線。把線繞這段縫線 5–7 圈,形成牢固的線腳。",
        },
        tip: {
          en: "A proper shank prevents the button from pulling and tearing the fabric over time.",
          nb: "En skikkelig hals hindrer at knappen drar i og river stoffet over tid.",
          zh: "好的線腳能避免釦子日久拉扯撕裂布料。",
        },
      },
      {
        id: "button-5",
        title: { en: "Fasten Off", nb: "Fest av", zh: "收尾" },
        description: {
          en: "Pass the needle back through the fabric to the wrong side. Make 2–3 small stitches through the thread loops on the back to lock. Trim thread close to the knot.",
          nb: "Stikk nålen tilbake gjennom stoffet til vrangsiden. Lag 2–3 små sting gjennom trådløkkene på baksiden for å låse. Klipp tråden tett ved knuten.",
          zh: "把針再穿回布的反面,在背面的線圈中縫 2–3 個小針來鎖線,最後沿結剪線。",
        },
        tip: {
          en: "For extra security, pass the needle through the knot itself before trimming.",
          nb: "For ekstra sikkerhet, før nålen gjennom selve knuten før du klipper.",
          zh: "為了更牢靠,剪線前讓針再穿過結一次。",
        },
      },
    ],
  },
  {
    id: "zipper",
    title: {
      en: "Installing a Zipper",
      nb: "Sette i en glidelås",
      zh: "安裝拉鍊",
    },
    emoji: "🤐",
    accentClass: "bg-secondary-300",
    bgClass: "bg-primary-100",
    stepClass: "bg-primary-300",
    video: "/videos/zipper.mov",
    steps: [
      {
        id: "zipper-1",
        title: {
          en: "Choose the Right Zipper",
          nb: "Velg riktig glidelås",
          zh: "選擇合適的拉鍊",
        },
        description: {
          en: "Select a zipper 2–3 cm longer than the opening. Coil zippers are flexible and good for curved seams; plastic and metal zippers are sturdier for bags. Match zipper weight to fabric weight.",
          nb: "Velg en glidelås som er 2–3 cm lengre enn åpningen. Spiralglidelåser er fleksible og bra til buede sømmer; plast- og metallglidelåser er sterkere for vesker. Tilpass glidelåsens vekt til stoffets vekt.",
          zh: "選比開口長 2–3 公分的拉鍊。螺旋拉鍊柔軟,適合弧形接縫;塑鋼或金屬拉鍊較堅固,適合包款。拉鍊重量要配合布料厚度。",
        },
        tip: {
          en: "A slightly longer zipper is easier to install — you can trim or tuck the excess at the bottom.",
          nb: "En litt for lang glidelås er lettere å sette i — du kan klippe eller brette overskuddet i bunnen.",
          zh: "拉鍊稍長比較好裝 — 多餘部分可在尾端剪掉或塞入。",
        },
      },
      {
        id: "zipper-2",
        title: {
          en: "Prepare the Seam",
          nb: "Klargjør sømmen",
          zh: "準備縫份",
        },
        description: {
          en: "Press under the seam allowance (usually 1.5 cm) on both sides of the opening. If working on a seam, stitch the seam below the zipper opening and baste the zipper portion closed temporarily.",
          nb: "Stryk inn sømmonn (vanligvis 1,5 cm) på begge sider av åpningen. Hvis du jobber på en søm, sy sømmen under glidelåsåpningen og tråkle glidelåsdelen midlertidig sammen.",
          zh: "把開口兩側的縫份(通常 1.5 公分)熨燙摺入。若是在接縫上,先車合拉鍊開口以下的部分,再用假縫暫時把拉鍊段縫合。",
        },
        tip: {
          en: "Press crisp folds — a well-pressed edge makes pinning and stitching much more accurate.",
          nb: "Stryk skarpe bretter — en godt strøket kant gjør det mye lettere å feste med nåler og sy nøyaktig.",
          zh: "把摺邊燙得挺直 — 邊熨平,別針與車線會更精準。",
        },
      },
      {
        id: "zipper-3",
        title: {
          en: "Pin & Baste the Zipper",
          nb: "Fest og tråkle glidelåsen",
          zh: "別針並假縫拉鍊",
        },
        description: {
          en: "Place the zipper face-down on the wrong side of the fabric, aligning the zipper tape edge with the pressed fold. Pin in place, then baste by hand or machine (longest stitch) down each side.",
          nb: "Legg glidelåsen med rette siden ned på vrangen av stoffet, og juster glidelåsbåndets kant mot den strøkne bretten. Fest med knappenåler, og tråkle for hånd eller med lengste maskinsting langs hver side.",
          zh: "把拉鍊正面朝下放在布的反面,讓拉鍊織帶邊緣對齊熨好的摺邊。先別針固定,再用手縫或機縫最長針距假縫兩側。",
        },
        tip: {
          en: "Use wonder clips instead of pins near the zipper teeth — pins can slip and distort placement.",
          nb: "Bruk wonder clips i stedet for knappenåler nær glidelåstennene — knappenåler kan gli og skjeive plasseringen.",
          zh: "拉鍊齒附近用布夾代替別針 — 別針容易滑動,使位置偏掉。",
        },
      },
      {
        id: "zipper-4",
        title: {
          en: "Attach the Zipper Foot",
          nb: "Sett på glidelåsfoten",
          zh: "裝上拉鍊壓布腳",
        },
        description: {
          en: "Replace the standard presser foot with a zipper foot. The zipper foot has a single toe that lets you stitch right next to the zipper teeth. Adjust to the left or right side as needed.",
          nb: "Bytt ut den vanlige trykkfoten med en glidelåsfot. Glidelåsfoten har én tå som lar deg sy rett ved siden av glidelåstennene. Juster til venstre eller høyre etter behov.",
          zh: "把標準壓布腳換成拉鍊壓布腳。它只有一邊腳趾,可以緊貼拉鍊齒車線,依需要調到左側或右側。",
        },
        tip: {
          en: "Test the zipper foot position on a scrap first so the stitching line falls in the right place.",
          nb: "Test glidelåsfotens posisjon på en stoffrest først, så stinglinjen havner riktig.",
          zh: "先用碎布試一下拉鍊壓布腳位置,確保車線落在正確位置。",
        },
      },
      {
        id: "zipper-5",
        title: {
          en: "Topstitch Both Sides",
          nb: "Pyntestikking på begge sider",
          zh: "兩側壓明線",
        },
        description: {
          en: "Working from the right side of the fabric, stitch down one side of the zipper ~3 mm from the fold. Stop at the bottom with the needle down, pivot, stitch across the bottom, pivot again, and stitch up the other side.",
          nb: "Sy fra retten av stoffet, ned langs den ene siden av glidelåsen, ca. 3 mm fra bretten. Stopp i bunnen med nålen nede, drei, sy tvers over bunnen, drei igjen og sy oppover den andre siden.",
          zh: "從布料正面,沿拉鍊一側距摺邊約 3 公釐車到底。底部停針(針留在布上)、轉向、橫車過底、再轉向、車上另一側。",
        },
        tip: {
          en: "Move the zipper pull out of the way as you sew by unzipping partially and nudging it behind the foot.",
          nb: "Flytt glidelåssliden vekk underveis ved å åpne litt og dytte den bak foten.",
          zh: "車的時候把拉頭部分拉開、推到壓布腳後方,以免擋路。",
        },
      },
      {
        id: "zipper-6",
        title: {
          en: "Remove Basting & Test",
          nb: "Fjern tråklingen og test",
          zh: "拆假縫並測試",
        },
        description: {
          en: "Use a seam ripper to remove the basting stitches along the zipper opening. Open and close the zipper several times to check for smoothness. Press lightly with a pressing cloth over the zipper tape.",
          nb: "Bruk en sømspretter til å fjerne tråklestingene langs glidelåsåpningen. Åpne og lukk glidelåsen flere ganger for å sjekke at den glir godt. Stryk lett med en pressduk over glidelåsbåndet.",
          zh: "用拆線器拆掉拉鍊開口上的假縫線,反覆開合幾次確認順暢。最後在拉鍊織帶上墊壓燙布輕輕熨燙。",
        },
        tip: {
          en: "Never press directly on zipper teeth — the heat can melt plastic coils or warp metal teeth.",
          nb: "Stryk aldri direkte på glidelåstennene — varmen kan smelte plastspiraler eller deformere metalltenner.",
          zh: "切勿直接熨燙拉鍊齒 — 高溫會融化塑鋼齒或使金屬齒變形。",
        },
      },
    ],
  },
];
