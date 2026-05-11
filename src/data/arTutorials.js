// AR tutorial step definitions. Each entry maps a template id to a list of
// guided AR steps consumed by ArTutorialScreen. Step textual content lives
// in src/patterns/<id>.js so StepGuideScreen can fall back to text-only
// when camera is unavailable.

export const arTutorials = {
  sewingMachine: {
    requiresCalibration: false,
    fallbackPxPerCm: 5.6,
    backTarget: "learn",
    steps: [
      {
        id: "machine-1",
        title: {
          en: "Wind the Bobbin",
          nb: "Spol underspolen",
          zh: "繞底線",
        },
        instruction: {
          en: "Run thread from the spool through the winder guide and wrap around an empty bobbin.",
          nb: "Før tråden fra snellen gjennom underspoleguiden og vikle den rundt en tom underspole.",
          zh: "把線從線軸穿過繞線導線器,繞在空梭芯上。",
        },
        tip: {
          en: "Wind at medium speed for even tension — too fast causes uneven winding.",
          nb: "Spol med middels hastighet for jevn tråd — for fort gir ujevn spoling.",
          zh: "用中速繞線張力才會均勻 — 太快會繞得不平整。",
        },
        durationMin: 3,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            {
              xNorm: 0.18,
              yNorm: 0.32,
              label: { en: "Spool", nb: "Trådsnelle", zh: "線軸" },
            },
            {
              xNorm: 0.5,
              yNorm: 0.24,
              label: {
                en: "Winder Guide",
                nb: "Spoleguide",
                zh: "繞線導線器",
              },
            },
            {
              xNorm: 0.82,
              yNorm: 0.32,
              label: {
                en: "Empty Bobbin",
                nb: "Tom underspole",
                zh: "空梭芯",
              },
            },
          ],
        },
      },
      {
        id: "machine-2",
        title: {
          en: "Thread the Upper Thread",
          nb: "Træ overtråden",
          zh: "穿上線",
        },
        instruction: {
          en: "Follow the numbered path with presser foot raised: spool → guide → tension → take-up lever → needle.",
          nb: "Følg den nummererte stien med trykkfoten hevet: snelle → fører → strammer → trådfanger → nål.",
          zh: "壓布腳抬起,依編號順序穿線:線軸 → 導線器 → 張力盤 → 挑線桿 → 機針。",
        },
        tip: {
          en: "Raising the presser foot opens the tension discs so the thread seats correctly.",
          nb: "Når trykkfoten heves åpnes strammeskivene slik at tråden sitter riktig.",
          zh: "抬起壓布腳會打開張力盤,線才能正確嵌入。",
        },
        durationMin: 4,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            {
              xNorm: 0.18,
              yNorm: 0.2,
              label: { en: "Spool", nb: "Trådsnelle", zh: "線軸" },
            },
            {
              xNorm: 0.34,
              yNorm: 0.32,
              label: {
                en: "Thread Guide",
                nb: "Trådfører",
                zh: "導線器",
              },
            },
            {
              xNorm: 0.5,
              yNorm: 0.55,
              label: {
                en: "Tension Discs",
                nb: "Strammeskiver",
                zh: "張力盤",
              },
            },
            {
              xNorm: 0.55,
              yNorm: 0.3,
              label: {
                en: "Take-up Lever",
                nb: "Trådfanger",
                zh: "挑線桿",
              },
            },
            {
              xNorm: 0.58,
              yNorm: 0.78,
              label: { en: "Needle", nb: "Nål", zh: "機針" },
            },
          ],
        },
      },
      {
        id: "machine-3",
        title: {
          en: "Insert the Bobbin",
          nb: "Sett inn underspolen",
          zh: "裝入梭芯",
        },
        instruction: {
          en: "Drop the wound bobbin into the slot and pull the thread under the needle plate. Counter-clockwise.",
          nb: "Legg den fylte underspolen i sporet og dra tråden under nåleplaten. Mot klokka.",
          zh: "把繞好的梭芯放入梭芯槽,線拉到針板下,逆時針方向。",
        },
        tip: {
          en: "The thread should unwind counter-clockwise when placed correctly.",
          nb: "Tråden skal vikles av mot klokka når den er plassert riktig.",
          zh: "梭芯放對時,線會以逆時針方向拉出。",
        },
        durationMin: 2,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: false,
          points: [
            {
              xNorm: 0.5,
              yNorm: 0.7,
              label: {
                en: "Bobbin Slot",
                nb: "Underspole-spor",
                zh: "梭芯槽",
              },
              value: {
                en: "↺ counter-clockwise",
                nb: "↺ mot klokka",
                zh: "↺ 逆時針",
              },
            },
          ],
        },
      },
      {
        id: "machine-4",
        title: {
          en: "Set Stitch Length & Tension",
          nb: "Still inn stinglengde og spenning",
          zh: "設定針距與張力",
        },
        instruction: {
          en: "Stitch length 2.5–3 mm, tension 3–5 for most fabrics. Adjust if knots show on either side.",
          nb: "Stinglengde 2,5–3 mm, spenning 3–5 for de fleste stoffer. Juster hvis det dannes knuter på en av sidene.",
          zh: "多數布料用針距 2.5–3 公釐、張力 3–5。若兩面出現結點再調整。",
        },
        tip: {
          en: "Always test on a scrap of the same fabric before sewing your actual pieces.",
          nb: "Test alltid på en stoffrest før du syr på selve plagget.",
          zh: "正式縫之前,先在同款布料的碎布上試縫。",
        },
        durationMin: 3,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: false,
          points: [
            {
              xNorm: 0.32,
              yNorm: 0.42,
              label: {
                en: "Stitch Length",
                nb: "Stinglengde",
                zh: "針距",
              },
              value: { en: "2.5–3 mm", nb: "2,5–3 mm", zh: "2.5–3 公釐" },
            },
            {
              xNorm: 0.66,
              yNorm: 0.42,
              label: {
                en: "Tension",
                nb: "Tråd­spenning",
                zh: "張力",
              },
              value: { en: "3–5", nb: "3–5", zh: "3–5" },
            },
          ],
        },
      },
      {
        id: "machine-5",
        title: {
          en: "Start & End a Seam",
          nb: "Start og avslutt en søm",
          zh: "起針與收針",
        },
        instruction: {
          en: "Forward 3–4 stitches, backstitch to lock, sew to end, backstitch again to finish.",
          nb: "3–4 sting forover, sy tilbake for å låse, sy til enden, sy tilbake igjen for å avslutte.",
          zh: "先車 3–4 針,再回針鎖線,車到底再回針一次收尾。",
        },
        tip: {
          en: "Keep your hands lightly guiding the fabric — don't push or pull, just steer.",
          nb: "La hendene lett styre stoffet — ikke skyv eller dra, bare før det.",
          zh: "雙手只輕輕引導布料 — 不要推也不要拉,只控制方向。",
        },
        durationMin: 5,
        overlayType: "numbered-callouts",
        overlay: {
          connectArrows: true,
          points: [
            {
              xNorm: 0.5,
              yNorm: 0.5,
              label: {
                en: "Start: 3–4 stitches",
                nb: "Start: 3–4 sting",
                zh: "起針: 3–4 針",
              },
              value: { en: "↓", nb: "↓", zh: "↓" },
            },
            {
              xNorm: 0.5,
              yNorm: 0.6,
              label: {
                en: "Backstitch (lock)",
                nb: "Tilbakesting (lås)",
                zh: "回針(鎖線)",
              },
              value: { en: "↑", nb: "↑", zh: "↑" },
            },
            {
              xNorm: 0.5,
              yNorm: 0.75,
              label: {
                en: "Sew to end",
                nb: "Sy til enden",
                zh: "車到底",
              },
              value: { en: "↓↓", nb: "↓↓", zh: "↓↓" },
            },
            {
              xNorm: 0.5,
              yNorm: 0.85,
              label: {
                en: "Backstitch (finish)",
                nb: "Tilbakesting (avslutt)",
                zh: "回針(收尾)",
              },
              value: { en: "↑", nb: "↑", zh: "↑" },
            },
          ],
        },
      },
    ],
  },

  noSewTote: {
    requiresCalibration: false,
    fallbackPxPerCm: 5.6,
    doneTarget: "result",
    steps: [
      {
        id: "cut-sleeves",
        title: {
          en: "Cut neckline and both sleeves",
          nb: "Klipp halsringen og begge ermene",
          zh: "剪領口與兩邊袖子",
        },
        instruction: {
          en: "Cut the neckline along the U-curve and each sleeve along the J-curve.",
          nb: "Klipp halsringen langs U-kurven og hvert erme langs J-kurven.",
          zh: "沿 U 形曲線剪領口,沿 J 形曲線剪每側袖子。",
        },
        tip: {
          en: "Cut both sleeves the same way so the armholes match.",
          nb: "Klipp begge ermene likt så ermehullene blir like.",
          zh: "兩邊袖子要剪一樣,袖洞才對稱。",
        },
        durationMin: 5,
        overlayType: "cut-line-pair",
        overlay: {
          sleeves: {
            left: { xNorm: 0.22, yTopNorm: 0.18, lengthCm: 24 },
            right: { xNorm: 0.78, yTopNorm: 0.18, lengthCm: 24 },
          },
          neckline: { yTopNorm: 0.16, widthCm: 22, depthCm: 17 },
        },
      },
      {
        id: "cut-fringe",
        title: {
          en: "Cut fringe along the bottom hem",
          nb: "Klipp frynser langs nedre kant",
          zh: "沿下襬剪流蘇",
        },
        instruction: {
          en: "Cut 12 vertical strips, each ~8 cm deep and ~2.5 cm wide.",
          nb: "Klipp 12 vertikale strimler, hver ca. 8 cm dype og 2,5 cm brede.",
          zh: "剪出 12 條垂直條,每條深約 8 公分、寬約 2.5 公分。",
        },
        tip: {
          en: "Use the marks as a guide. Don't cut all the way through.",
          nb: "Bruk merkene som guide. Ikke klipp helt gjennom.",
          zh: "依標記下剪,不要剪到底。",
        },
        durationMin: 8,
        overlayType: "fringe-marks",
        overlay: {
          count: 12,
          spacingCm: 2.5,
          depthCm: 8,
          hemYNorm: 0.78,
        },
      },
      {
        id: "tie-knots",
        title: {
          en: "Tie pairs of strips into knots",
          nb: "Knytt strimlene sammen i par",
          zh: "把成對的條打結",
        },
        instruction: {
          en: "Tie each strip to its neighbor with a tight double knot. The knots will close the bottom of your bag.",
          nb: "Knytt hver strimmel til naboen med en stram dobbel knute. Knutene lukker bunnen av posen din.",
          zh: "把每條布條與相鄰的另一條打緊雙結,結會把袋底封起來。",
        },
        tip: {
          en: "Place phone on a stand and use two hands. Tap a pair to mark it done.",
          nb: "Sett telefonen på en stativ og bruk begge hender. Trykk på et par for å markere det som ferdig.",
          zh: "把手機架起來,雙手打結。點選一對標記為完成。",
        },
        durationMin: 7,
        overlayType: "knot-pairs",
        overlay: {
          inheritFrom: "cut-fringe",
          showNumbers: true,
          handsOffMode: true,
        },
      },
    ],
  },
};
