# LOG.md — Fashion Flipper

詳細執行方式與變更紀錄。

---

## 執行說明

### 環境需求

- Node.js >= 18
- npm >= 9

### 安裝依賴

```bash
cd /Users/huanglijue/Documents/114-2/Sewing
npm install
```

### 啟動開發伺服器

```bash
npm run dev
# 預設開啟於 http://localhost:5173（含 --host，可用手機同網段瀏覽）
```

### 建置產出

```bash
npm run build    # 輸出至 dist/
npm run preview  # 預覽 build 結果
```

### 畫面導覽順序

```
home → upload → analysis → templateSelect → stepGuide → result
                                                       ↕
                                                   community
```

---

## 變更紀錄

## 2026-05-16 21:30
- 修改檔案：`src/components/PhoneFrame.jsx`
- 修改內容：修 tour 進行中手機版語言切換器被擋的問題。
- 兩段試錯：
  1. 第一輪只把 LanguageSwitcher 的 zIndex 從 60 改到 200 — **沒效**，因為它在 PhoneFrame 手機分支 `fixed inset-0` 容器內，父層 `position: fixed` 會建立自己的 stacking context，子層 z-index 都被鎖在父層上下文裡，到 body 視角還是被父層的 z-auto cap 住。
  2. 第二輪把 LanguageSwitcher 預設 position 從 `absolute` 改成 `fixed` — **還是沒效**，position: fixed 雖然會建立自己的 stacking context、anchor 到 viewport，但只要它仍是 fixed 父層的 DOM 子孫，stacking 仍然鎖在父層 context 裡。
  3. 第三輪（這次）：把手機版 LanguageSwitcher 從 `fixed inset-0` 容器**抽出來當兄弟**，包在一個沒有 position 的 `<div className="sm:hidden">` 裡。這樣它的 z-200 stacking context 直接屬於 body，蓋得過 tour overlay 的 z-100。
- 教訓：`position: fixed` 永遠建立 stacking context，且 cap 所有後代的 z；要讓元素跳出某個 fixed/transformed 祖先的 stacking 籠子，**必須移到 DOM 之外**（變成兄弟或更上層），單調 z-index 沒用。
- Smoke test：`npm run build` 3.64s 成功。

## 2026-05-16 21:15
- 修改檔案：`src/App.jsx`、`src/screens/HomeScreen.jsx`
- 修改內容：把 `<CoachmarkTour>` 從 HomeScreen 拉到 App.jsx 頂層 mount。
- 動機：上一版用 `createPortal` 把 overlay 渲到 `document.body`，繞過了 PhoneFrame 用 `display:none` 隱掉的副本 → HomeScreen 被 mount 兩次（PhoneFrame 桌機/手機分支各 render 一次），兩份 CoachmarkTour 都 portal 到 body，**兩個 overlay 同時可見**，各自有獨立 `idx` state。
- 修法：CoachmarkTour 改在 App.jsx 頂層 mount（不在 PhoneFrame 內），這樣只 mount 一次。HomeScreen 不再接 `showTour` / `onTourDone` props，`TOUR_STEPS` 常數也搬到 App.jsx。targets 仍然是 HomeScreen + BottomNav 上的 `data-tour="…"` 元素，CoachmarkTour 的 `findVisible(selector)` 會跳過被 display:none 隱藏的副本。
- Smoke test：`npm run build` 4.90s 成功。

## 2026-05-16 21:05
- 修改檔案：`src/components/CoachmarkTour.jsx`、`src/components/PhoneFrame.jsx`、`src/index.css`
- 修改內容：把 coachmark tour 改成穩定能在桌機/手機/iOS in-app 瀏覽器運作。
  - **核心 bug**：PhoneFrame 為了 hidden sm:flex / sm:hidden 切換而**同時 render 兩個分支**，兩邊都吐 `{children}` → HomeScreen 被 mount 兩次 → DOM 裡有兩份 `[data-tour="..."]` 元素。其中一份被 Tailwind class 隱藏（display:none），其 `getBoundingClientRect()` 是 `0×0`。`document.querySelector` 永遠回傳 DOM 順序第一個，桌機運氣好抓到可見的，手機卻抓到被隱藏的零尺寸副本 → spot 在 (0,0)、tipTop 被 clamp 到頂端、tooltip 整個跑到畫面最上方。
  - **修法 1**：抽出 `findVisible(selector)` 通通改用它（包括 frame 與 target 的查詢），抓「DOM 裡第一個 rect 非零」的元素，跳過被隱藏的副本。
  - **修法 2**：CoachmarkTour 改用 `react-dom` 的 `createPortal` 把整個 overlay 渲染到 `document.body`，跳過所有祖先元素，避免任何 transform/filter/contain 之類 CSS 改寫 `position: fixed` 的 containing block。
  - **修法 3**：mobile (< sm 斷點) 用 `window.innerWidth/innerHeight` 當 frame 而不是讀 data-tour-frame 元素的 rect — 解決 iOS WKWebView 對 fixed 元素的 `getBoundingClientRect` 高度可能塌縮的問題。
  - PhoneFrame 兩個分支都加上 `data-tour-frame` 標記，CoachmarkTour 桌機路徑找 frame 用。
  - `index.css` 加 `html, body { height: 100% }` — 給 iOS in-app 瀏覽器明確的高度錨點，讓 `position: fixed` 跟 viewport 對齊更穩。
- 動機：使用者回報手機版（WeChat in-app + Chrome iOS）tooltip 永遠卡在畫面最上方，亮區也對不上 Learn / Profile icon。電腦版正常。臨時加紅色 debug overlay 把 `rect`、`bound`、`tipH`、`tipTop` 印在畫面上才看出 `rect=0,0 0×0` 的關鍵線索。

## 2026-05-16 20:10
- 新增檔案：`src/components/CoachmarkTour.jsx`
- 修改檔案：`src/screens/HomeScreen.jsx`、`src/components/BottomNav.jsx`、`src/App.jsx`、`src/i18n/translations.js`
- 刪除檔案：`src/screens/WalkthroughScreen.jsx`（前一版 19:58 加的整頁 walkthrough 廢棄）
- 修改內容：把 walkthrough 從「整頁介紹」改成「直接罩在 HomeScreen 上的 coachmark 聚光燈 tooltip tour」，3 站介紹首頁三大入口。
  - **CoachmarkTour**：通用 overlay。吃 `steps: [{ target, radius?, placement? }]`，每一站用 `document.querySelector(target)` 抓真實 DOM 元素，`getBoundingClientRect` 換成相對於 overlay parent 的座標，畫一個 padding 8px 的「亮區」上面套白色 ring，外圍用 `box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)` 做暗背景。座標切換做 220ms transition。tooltip 是白卡片：標題 + 描述 + dot indicators + Back / Next / Got it。placement 自動：目標在上半部 tooltip 放下方，下半部放上方（也可顯式指定 `"above"/"below"`）。Skip 在右上角。Overlay `pointer-events: auto` + 亮區 `pointer-events: none`，使用者只能用 tooltip 的按鈕推進，無法直接點到被高亮的元素。
  - **HomeScreen**：
    - root div 加 `relative` 給 overlay 用 `absolute inset-0`。
    - hero「開始改造」按鈕加 `data-tour="tour-start"`。
    - 接 `showTour` + `onTourDone` props，true 時 mount `<CoachmarkTour>`。
    - 三站定義 `TOUR_STEPS`：start（rounded-full pill 用 `radius: 999`）、learn（圖示按鈕用 `radius: 14`、`placement: "above"`）、profile（同 learn）。
  - **BottomNav**：在 NAV_ITEMS map 裡，當 `id === "learn"` 加 `data-tour="tour-learn"`；獨立的 Profile 按鈕加 `data-tour="tour-profile"`。
  - **App.jsx**：拿掉 walkthrough 為獨立 screen 的設計（不再有 screen map 的 `walkthrough` entry、不再 import WalkthroughScreen）。HomeScreen 接收 `showTour={!walkthroughSeen}` + `onTourDone={markWalkthroughSeen}`。SkillLevel gate 維持不變，順序回到 skillLevel → home（home 上自帶 tour）。
  - **i18n**：保留 `walkthrough` namespace，三語各重寫 `step1/2/3.{title,body}` 對齊三個入口的實際功能；`getStarted` 改成 `done`。
- 動機：上一版整頁 walkthrough 太抽象，這版直接指著真實 UI 講「這顆按鈕做什麼」更具體；3 站對應使用者實際會用到的入口（開始改造 / 縫紉教程 / 個人檔案），看完馬上知道從哪開始。
- 設計選擇：用 `data-tour` 屬性而不是 ref drilling，CoachmarkTour 不用知道 HomeScreen / BottomNav 內部結構，加新站點只要在目標元素貼 attribute + 在 `TOUR_STEPS` 加一行。
- Smoke test：`npm run build` 5.96s 成功、`npm test` 54/54 過。Vite HMR 自動推送，瀏覽器清 `localStorage.removeItem("ff_walkthrough_seen_v1")` 重整可重看。

## 2026-05-16 19:45
- 動作：把 origin/main（GitHub 上的新設計）合進本地未提交的 skillLevel / scrunchie 工作。
- 合進來的 origin 端：fast-forward 16 commits（`2c673ff..6434b4b`），主要是
  - 切到 fal.ai 的 segmentation 後端（api/segment.js、services/segmentation.js、worker）
  - 新元件 `ManualFabricForm.jsx`（fabric API fail 時讓使用者手動填）
  - 新元件 `PatternPanel.jsx`、`PatternLayoutScreen` 大重構（桌機/行動端拖曳順手 + 整頁滾動）
  - `useAnalysisPipeline` 加 background pre-scheduling / warmup、`setManualFabric`、`segmentationFailed`、`retry()` force-bypass cache
  - 對應 i18n / Vercel config / vitest config / 54 條測試
- 衝突解掉的兩個檔（`git stash pop` 同名修改）：失敗框架整套採 origin。
  - `src/hooks/useAnalysisPipeline.js`：用 origin 的 `fabricFailed` + `segmentationFailed` + `setManualFabric` + `retry()`（force bypass cache + 重跑整個 pipeline）+ `lastSegResultRef`。本地原本加的 `retryFabricAnalysis()`（in-place 只重打 fabric API）、`fabricRetrying`、`_imageFileRef` 全部移除。
  - `src/screens/AnalysisScreen.jsx`：用 origin 的 failed phase（Try again / Enter fabric manually / Continue anyway 三條路）+ results 頁的 `needsManualInput` dimensions warning banner。本地原本加的 results 頁 fabric-failed banner 和對應 destructure 都拿掉。
  - `src/i18n/translations.js`：移除本地 `analysis.fabricFailedTitle/fabricFailedBody/retryAnalysis/retrying` 三語 key（origin 走 `failedFabricTitle` / `enterFabricManually` / `continueAnyway` / `tryAgain`）。
- 自動合併但檢查過沒被吃掉的：
  - `src/screens/TemplateSelectScreen.jsx`：origin 的 `CACHE_PREFIX` / `key.split("_").at(-1)` 重構與 local 的 skillLevel filter / `levelByDifficulty` 卡片配色全部都在
  - `src/i18n/translations.js`：origin 與 local 各加各的 key，互不重疊
- 未動到的 local 改動：App.jsx 的 skillLevel gate、HomeScreen 依等級推薦、ProfileEditorScreen 的 SKILL_LEVELS 選擇器、useProfiles.addProfile 的 extra 參數、ArOverlays 的 GeometricGuideOverlay、scrunchie 全套（templates / fabricRequirements / patternAreas / arTutorials / 文字 fallback / svg）。
- 備份：`backup-before-merge-2026-05-16` branch 指向合併前的 commit `2c673ff`；舊 stash `pre-merge-stash 2026-05-16` 還在 stash list（合併已收尾，可以 `git stash drop stash@{0}`）。
- 驗證：`npm install` → `npm run build` 7.39s 成功（scrunchie chunk 4.91kB）、`npm test` 54/54 過。

## 2026-05-12 12:21
- 新增檔案:public/scrunchie-pattern.svg、src/patterns/scrunchie.js
- 修改檔案:src/data/templates.js、src/data/fabricRequirements.js、src/data/patternAreasBySize.js、src/data/arTutorials.js、src/components/ArOverlays.jsx、src/screens/ArTutorialScreen.jsx
- 修改內容:加入 beginner 等級的「牛仔褲方巾髮圈」版型 + AR 教學。
  - **新 template `scrunchie`**:difficulty 1、emoji 🎀、forGender "any"、patternSource "ar-tutorial"(沿用 noSewTote 走法,TemplateSelect 對這個值會跳過 PatternLayout 直接 navigate("arTutorial"))。materials 列舊牛仔褲、髮圈鬆緊帶、蕾絲花邊、剪刀、縫紉機/針線。previewPromptOverride 描述「方形小坐墊狀、四邊蕾絲、中央藏鬆緊帶」,引導 Gemini img2img 保留使用者原牛仔布的色調與紋理。新欄位 `patternReferenceSvg: "/scrunchie-pattern.svg"` 指向使用者提供的幾何圖(外框 25cm 方形 + 內框 1cm fold line + 雙圈 sew/cut 圓)。
  - **Feasibility config**:fabricRequirements.scrunchie 設 minWeightClass 1 / maxWeightClass 4 / allowKnit true(髮圈布料很寬容,denim 是設計意圖但棉麻針織都行)。patternAreasBySize.scrunchie 固定 1250 cm²(兩塊 25×25 = 1250 cm² 對折剪)所有 size 同值。
  - **新 overlay primitive `GeometricGuideOverlay`**(ArOverlays.jsx 尾端):general-purpose 元件,吃一個 shapes array,每個 shape 可指定 kind (square/circle)、sizeCm、color (white/blue/red/yellow/orange/green)、style (solid/dashed)、strokeCm、offsetCm、label。整組以畫面中央為錨點,dragOffset 平移所有 shape 一起;maxRadius 算出最大形狀邊界當 drag-grab 區。比為每個步驟寫一個專屬 component 維護成本低很多。
  - **7 步 AR tutorial**(arTutorials.js 加 scrunchie entry):
    1. materials — `numbered-callouts` 4 個位置(denim / elastic / lace / scissors)
    2. cut-square — `geometric-guide` 一個白色虛線 25cm 方框
    3. sew-circle — 加一個藍色實心 8cm 圓圈(縫線)
    4. cut-hole — 再疊一個紅色虛線 7cm 圓圈(剪線,留 0.5cm 縫份)
    5. insert-elastic — 換成橘色實心 8.5cm 環表示鬆緊帶位置(取代藍紅圓)
    6. fold-edges — 外框 25cm + 內框 23cm 黃色實線(1cm 折邊+蕾絲縫合線)
    7. celebrate — `numbered-callouts` 一個「🎉 完成!」chip
  - **ArTutorialScreen dispatcher**:import GeometricGuideOverlay,加 `step.overlayType === "geometric-guide"` 分支。
  - **文字 fallback** (src/patterns/scrunchie.js):同 7 步,當相機權限被拒或在桌機沒鏡頭時 StepGuideScreen 動態 import 顯示純文字版本。Title / description / tip 三語(en/nb/zh)齊全。
  - 因為 templates 內所有 string 都已是 `{en,nb,zh}` 物件、AR tutorial 也用 `{en,nb,zh}`,這次不必再動 translations.js 的 namespace key。
- 動機:給 beginner 等級多一個容易上手、用廢牛仔褲就能做的小品項,順便讓 AR tutorial 框架支援更多形狀(原本只有 cut-line-pair / fringe-marks / knot-pairs / numbered-callouts,新增的 geometric-guide 之後做拉鍊袋、口袋之類也能直接複用)。
- 動機(資料):使用者提供的 SVG(外 765px × 765px ≈ 25cm 方框、內 23cm fold 框、半徑 141.7px ≈ 4.6cm 縫圈、半徑 170px ≈ 5.6cm 剪圈)直接對應 step 2 / 3 / 4 / 6 的幾何配置,參數一比一抄進 arTutorials.js。
- Smoke test:`npm run build` 成功(9.66s,617 modules)。

## 2026-05-12 12:11
- 修改檔案:src/hooks/useAnalysisPipeline.js、src/screens/AnalysisScreen.jsx、src/i18n/translations.js
- 修改內容:布料分析失敗時加 Retry UI(對應 5/12 0:45 那筆的 TODO)。
  - **問題回顧**:`analyzeFabric()` 失敗(rate limit / content filter / network)會 silently return null,pipeline 沿用 `mockAnalysis.fabric` 的預設值(Cotton 85% / Polyester 15% / Deep Blue),使用者完全不知道自己看到的是 mock,還會以為 AI 真的判定他的衣服是這樣 — 而且下游 TemplateSelect 的 `fabric` 雖然 truthy 但配的是錯的布料,影響 feasibility 與 preview 生成的 prompt。今天剛好撞到這個情況,使用者誤以為「圖跑不出來」,實際是分析失敗+下游邏輯沒提示。
  - **useAnalysisPipeline 改動**:新增 `fabricFailed`(boolean)+ `fabricRetrying`(boolean)兩個 state、`_imageFileRef`(stash 原始 file)。`run()` 在 `analyzeFabric` 回 null 時 `setFabricFailed(true)`,成功時 `false`。新增 `retryFabricAnalysis()` callback,只重跑布料這一段(segmentation / measurements 不用重跑),成功時更新 fabric + ref + 清 failed flag;若已過 feasibility 階段,用新 fabric 重新 `checkFeasibility(measurements, templatesWithPieces, result)` 更新 `feasibleTemplates`(下游 TemplateSelect 的 fabric 警告/排序才會跟著對)。`analyzeFabric(file, { force: true })` 跳過 sessionStorage cache 強制重打 API。reset() 也清新增的 flag。
  - **AnalysisScreen UI**:`fabricFailed === true` 時在內容上方掛一個 amber 邊框的警告卡:⚠ icon + 「布料分析失敗」標題 + 一句「下面是預設值,點重試取得真實分析」+ amber-500 的 Retry 按鈕。重試中按鈕 disabled 並顯示 spinner(`border-2 border-white border-t-transparent rounded-full animate-spin`),i18n 切到「重試中…」。
  - **i18n**:三語新增 `analysis.fabricFailedTitle` / `fabricFailedBody` / `retryAnalysis` / `retrying`。
- 動機:不再讓使用者誤以為 mock 預設值是 AI 真的分析結果,撞到 quota / content filter 時給一個明確的修復路徑。
- Smoke test:`npm run build` 成功(41.13s,615 modules)。

## 2026-05-12 11:55
- 修改檔案:src/screens/TemplateSelectScreen.jsx、src/screens/HomeScreen.jsx、src/i18n/translations.js
- 修改內容:依使用者 skillLevel 過濾推薦的圖紙。
  - **TemplateSelectScreen 推薦清單**:新增 `showAllLevels` state 與 `profileDifficulty`(beginner→1 / intermediate→2 / advanced→3)。`visibleItems` useMemo 在原本的 gender filter 之後再加一層 skillLevel filter:`!showAllLevels && profileDifficulty != null` 時 `items.filter((t) => t.difficulty === profileDifficulty)`(精確匹配,beginner 只看 1 級、intermediate 只看 2 級等;沒寫成 `<=` 是因為使用者明確說「推薦這個等級的」)。MAX_VISIBLE_PATTERNS = 3 維持不變,filter 完才 slice。
  - **切換鈕**:在 gender filter pill 下方再加一條同款 skillLevel filter pill,顯示「Showing {level} patterns / 顯示{level}版型」+ 「Show all levels」鈕,點擊切換 showAllLevels。
  - **空狀態**:filter 後 visibleItems.length === 0 時(例如使用者是 advanced 但這件衣物布料只夠做 beginner 版型),顯示「目前沒有適合這件衣服的 {level} 版型」+ 一鍵切到「顯示所有等級」的 CTA,避免畫面只剩標題沒內容。
  - **HomeScreen 預覽 grid**:同樣依 activeProfile.skillLevel 算 profileDifficulty,filter `Object.values(templates)`。沒有 toggle(這只是 home 上的快速瀏覽,不是流程的核心)。標題從固定的「Available Templates」改成「Recommended for {level} / 為{level}推薦 / Anbefalt for {level}」,沒 skillLevel 時退回原標題。
  - **i18n**:三語新增 `templateSelect.showingForLevel` / `showingAllLevels` / `showAllLevels` / `noLevelMatches`(空狀態文案),`home.recommendedForLevel`。
- 動機:延續 11:25 的 skillLevel 改動,把「記下來」變成「真的有用」。使用者一進 App 選 beginner 之後,TemplateSelect 與 HomeScreen 都只看到 beginner 圖紙;需要看別等級時一鍵切換。
- Smoke test:`npm run build` 成功(10.98s)。

## 2026-05-12 11:25
- 新增檔案:src/data/skillLevels.js、src/screens/SkillLevelScreen.jsx
- 修改檔案:src/App.jsx、src/hooks/useProfiles.js、src/screens/ProfileEditorScreen.jsx、src/data/templates.js、src/screens/TemplateSelectScreen.jsx、src/screens/HomeScreen.jsx、src/i18n/translations.js
- 修改內容:三件一組的「技能等級個人化」改動。
  - **首次進 App 強制選等級**:App.jsx 加 gate — `!activeProfile || !activeProfile.skillLevel` 就強制把 effectiveScreen 切到 `skillLevel` 並渲染新的 SkillLevelScreen,無視當前 state.screen。SkillLevelScreen 沒返回鍵,只有確認後 `updateProfile(... { skillLevel })` 或 `addProfile(t("skillLevel.defaultProfileName"), { skillLevel })` 再 setActiveProfile,然後 navigate("home")。useProfiles.addProfile 從 `(name)` 擴成 `(name, extra = {})` 把 extra 合進 profile object,保持向下相容。
  - **可改性**:ProfileEditorScreen 在 gender 區塊下方加 skillLevel 三按鈕區塊(沿用 gender 的設計 pattern),state 預設 beginner;handleSave 把 skillLevel 一併寫進 updateProfile/addProfile changes。isNew 時 addProfile 改用 `addProfile(name, { skillLevel })`,避免新建 profile 仍缺 skillLevel 又被 gate 攔。
  - **17 個圖紙視覺分級**:新增 src/data/skillLevels.js 集中色票對照(`SKILL_LEVELS` array + `levelByDifficulty(d)` / `levelById(id)` helper):1=green-50/100/300/500/800、2=orange-*、3=blue-*。templates.js 砍掉 17 個 `accentColor` 欄位(原本顏色雜亂:lime/amber/sky/pink/indigo/purple/teal/rose/yellow...);7 個 difficulty=2 的 difficultyLabel 統一為 `Intermediate / Mellomnivå / 中級`(原本 2 個是 "Beginner+",5 個是 "Middels / 中階",現在全部一致)。
  - **TemplateSelectScreen 卡片重做**:卡片整體背景 `bg-primary-100` → `level.cardBg`、預設 border `border-primary-200` → `level.border`、縮圖底色 `template.accentColor` → `level.thumbBg`,三處上色一致。狀態 border(Top Recommendation `border-secondary-300` / Not Feasible `border-red-200` / Needs Interfacing `border-amber-300`)仍蓋過等級色。版型從原本「64×64 縮圖 + 標題下方再一堆全寬區塊」改為「圖片 w-1/2 aspect-square 在左,標題/%/時間/難度/match bar/fabric usage/描述/CTA 全部塞進右側 flex-col 欄位」。文字尺寸下調(text-lg → text-base / text-sm → text-xs / 10–11px chips)避免在半寬欄位爆版,描述 `line-clamp-3`,標題 `truncate + min-w-0`,CTA 用 `mt-auto` 沉到底。badges + fail reason 仍維持卡片頂部全寬。
  - **HomeScreen 預覽 grid**:底部「Available Templates」grid 卡片也套等級色,`bg-primary-50 + border-primary-200` → `level.cardBg + border-2 + level.border`,難度+時間文字改用 `level.text` 帶顏色凸顯。
  - **i18n**:三語新增 `skillLevel.*` namespace(title / subtitle / beginner / intermediate / advanced + 三段 desc / continue / defaultProfileName)+ `profileEditor.skillLevel` 標籤。
- 動機:後續功能要依使用者等級分流(這次不實作),先把資料欄位、入口 gate、視覺分級三層都立起來。
- Smoke test:`npm run build` 成功(615 modules transformed,13.59s,只有 既有的 chunk-size warning)。

## 2026-05-12 00:45
- 修改檔案:vite.config.js、api/analyze.js、src/services/fabricAnalysis.js
- 修改內容:修「多分析幾張就會看到 mock Deep Blue」的退化問題。Root cause:之前 00:15 的兩段式設計(Stage-1 vision + Stage-2 gpt-4o-mini 翻譯)每次分析吃 2 個 GitHub Models quota,免費額度大約撞到第 3、4 張就會在某一階段(常是 Stage-1 因為 4o 配額較緊)拿 429。Server 回非 200 → `analyzeFabric` catch 後 return null → `useAnalysisPipeline.run()` 內 `if (fabricResult) setFabric(...)` 不觸發 → fabric state 留在 reset 後的 `mockAnalysis.fabric` 預設值,UI 就顯示 Cotton 85% / Polyester 15% / Deep Blue。
  - **單階段 prompt**(vite.config.js + api/analyze.js):把 Stage-2 整塊砍掉,改寫 `SYSTEM_PROMPT` 讓 gpt-4o vision 直接回 `{ en, nb, zh }` 物件。每次分析從 2 calls → 1 call,quota 壓力減半;同時省掉 Stage-2 ~6 秒等待。
  - **token 配額**:max_tokens 600 → 1500(輸出變約 3 倍長,因為每個 string 變成三語物件)。
  - **CACHE_PREFIX v3 → v4**:舊 cache 雖 shape 正確,但其中部分是 Stage-2 失敗時靜默 fallback 的純英文 + 補的 nb/zh 翻譯品質不一,bump 確保都重新跑乾淨的 v4 路徑。
  - **graceful fallback 不再需要**:單一 call 失敗就讓 server 回 5xx,UI 後續會看到 null fabric 沿用 mock — 雖然外觀仍是 Deep Blue,但這是 rate-limit 真的撞到的情況,跟 Stage-2 半成功完全不同。
- TODO(UX,單獨任務):analyzeFabric 失敗時應該顯示「Analysis failed, retry?」按鈕,而不是讓使用者誤以為自己看到的就是 AI 的真實答案。
- Smoke test:`curl /api/analyze` 拿 1×1 白點測 — 一次 call 回完整 `{en,nb,zh}`,Stage-2 log 已消失。

## 2026-05-12 00:30
- 修改檔案:src/screens/PatternLayoutScreen.jsx
- 修改內容:修「點帽子(或 bag / noSewTote)進到 PatternLayout 就閃退/白屏」的 React crash。Root cause:`PieceShape` 三處直接 `{piece.label}` render,但 custom pattern 的 `patternPieces[i].label` 是 `{ en, nb, zh }` 物件(hat.js 等),React 看到物件當 child 直接 throw `Objects are not valid as a React child` 把整個 tree 拆掉,UI 等於消失。
  - **修正**:`PieceShape` signature 加 `tl` prop,default 用新增的 module-level `_enLabel` fallback(看 string 就回 string、看物件就取 `.en`),保證 PieceShape 在 caller 沒傳 tl 時也不會炸。三處 `{piece.label}` 統一改成 `{tl(piece.label)}`(replace_all,含 legend 那個)。Main component 從 `useLang()` 解構多拿一個 `tl`,在 mount 點 `<PieceShape ... tl={tl} />` 傳進去。
  - **為什麼之前 bag / noSewTote 沒爆**:它們其實也會爆,只是測試流程沒走到「進 PatternLayout 看 pieces 名稱」這一步;noSewTote 的 patternSource 是 `ar-tutorial`,TemplateSelectScreen 對它的 navigate 分支直接跳過 PatternLayout 進 ArTutorial,所以一直沒踩到。
- Smoke test:vite HMR 5 次 update 全綠;`http://localhost:5173/` HTTP 200。

## 2026-05-12 00:15
- 修改檔案:vite.config.js、api/analyze.js、src/services/fabricAnalysis.js、LOG.md
- 修改內容:布料分析結果改為三語(server-side 翻譯)。原本 GPT-4o vision 回的是純英文字串(`type/color/texture/weight/condition` + composition[].material + tags[]),即使 UI 切到 nb / zh 也只有「布料分析卡」永遠英文。
  - **Stage-2 翻譯**(vite.config.js 與 api/analyze.js):Stage 1 拿到 vision JSON 後,再對 GitHub Models 打第二次 — 用 **gpt-4o-mini**(翻譯任務夠用、token 約 4o 的 1/15)+ 新的 `TRANSLATE_SYSTEM_PROMPT`,把每個 translatable string 包成 `{ en, nb, zh }` 物件。Prompt 含 7 個 few-shot example(常見 fabric type / color / weight / texture / condition / tag + Unknown),確保穩定 schema。`temperature: 0`、`response_format: json_object`、`max_tokens: 800`。
  - **Graceful fallback**:Stage-2 任何步驟失敗(upstream non-200 / empty content / 解 JSON 失敗 / 拋例外)都退回 Stage-1 的純英文結果,client 端 `tl()` 看到 string 會原樣回傳,使用者最差就是看到英文而非看到錯誤頁。
  - **CACHE_PREFIX v2 → v3**(fabricAnalysis.js):強制讓 sessionStorage 內舊的純英文 v2 cache 過期。
  - **不改 client validator**:`!parsed.type` 在 type 是物件時仍 truthy、composition 仍是 Array、所以原檢查照常工作。
  - **downstream 不用改**:`fabricProfile.js` 的 `asEnString()` 跟 `previewGeneration.js` 的 `enStr()` 早就同時支援 string 與 `{en,nb,zh}` 兩種 shape(5/3 23:40 修 i18n 時就埋好的)。AnalysisScreen 等地方都已用 `tl(...)`。
- Smoke test:`curl /api/analyze` 拿 1×1 白點測 — Stage-1 6 秒、Stage-2 6 秒;回傳完整 `{en,nb,zh}` 物件,顏色「Bright Yellow → Lys gul → 明亮的黃色」、type 「Unknown → Ukjent → 未知」。Vite log 顯示 `[analyze] translate ok (6149ms)`。
- 成本影響:每次分析多一次 gpt-4o-mini call(~150 input tokens + ~250 output tokens),GitHub Models 免費 quota 內可忽略。

## 2026-05-12 00:05
- 修改檔案:src/screens/TemplateSelectScreen.jsx、src/screens/PatternLayoutScreen.jsx、src/i18n/translations.js
- 修改內容:把 i18n 三語線織回 22:00 merge 後失去 i18n 的兩個畫面。
  - **TemplateSelectScreen**:import `useLang`、component 內 `const { t, tl } = useLang()`,把 ~30 個硬寫英文(title / subtitle / topNHint / 尺寸 overlay 整段 / intro / longPressHint / showGarmentDimensions / 性別 filter 顯示與切換鈕 / 三種 fail reason / 三種 badge / template.name/time/description/difficultyLabel / fabricUsed / steps&materials count / Start Making / 模態 title / 模態 profile/preset/cancel/generate/continue / save-to-profile)替換成 `t("...")` / `tl(...)`。21:20 加的 `topNHint` JSX 提示也補回(只有 `items.length > MAX_VISIBLE_PATTERNS` 時顯示)。
  - **PatternLayoutScreen**:import `useLang`、新增 closure 內 `grainLabelI18n` 取代 module-level `grainLabel`(原本純函式拿不到 hook),dead `grainLabel` 刪掉。改 ~12 個硬寫字串(Pattern Layout title / subtitle / Print Pattern + tooltip / Reset + tooltip / Each panel / Grain / FRONT/BACK / 錯誤 banner 三段 / Retry / Drag-to-adjust badge / 移動側邊提示 / grainWarning / Pattern Pieces / Try on AR / Confirm Layout / Generating…)。
  - **translations.js**:新增 templateSelect 7 個 key(yourGarment / widthLabel / heightLabel / usableFabricOneSide / totalFabricBothSides / measurementsUnavailable / showGarmentDimensions),更新 `intro` 為 Siri 5/11 改的「fabric-enough + 百分比說明」較長版本;新增 patternLayout 6 個 key(reset / resetTooltip / retry / grainVertical / grainHorizontal / grainBias)。三語(en/nb/zh)全部齊備。
- Smoke test:`localhost:5180` HTTP 200、vite HMR ~40 次 update 全綠、無 syntax error。

## 2026-05-11 22:00
- 修改檔案:LOG.md(merge)、src/screens/TemplateSelectScreen.jsx、src/screens/PatternLayoutScreen.jsx、src/services/feasibility.js、public/logo.svg、src/utils/generateLayout.js(從 origin 新增)
- 修改內容:把 origin/main 的兩個 commit fast-forward 進來 — Siri 5/11 早上的 567cd10「pattern layout + cut-count feasibility + 新 logo + utils/generateLayout.js」與我們晚上 push 的 9e42e8f「Limit template list to top 3 patterns」。Local 對 TemplateSelectScreen / PatternLayoutScreen / feasibility / logo 這 4 個衝突檔的未 commit 改動全部丟棄,以 origin 版本為準(因此這 4 個檔暫時失去 i18n 線);其他 ~40 個 i18n / RulerCalibration / fabricAnalysis v2 / useAnalysisPipeline 的 5/9 工作完全保留。Merge 前已 `cp -r fashion-flipper-local fashion-flipper-local-backup-20260511`(705 MB 完整快照),要還原直接複製回來即可。
- 待辦:重新把 i18n 線織回 TemplateSelectScreen / PatternLayoutScreen(import useLang、把字串包成 t() 與 tl()、把下方 21:20 的 topNHint 提示 JSX 補回去);translations.js 內的 `templateSelect.topNHint` 在 i18n 沒織回之前是孤鍵但無害。

## 2026-05-11 21:20
- 修改檔案:src/i18n/translations.js(保留)、src/screens/TemplateSelectScreen.jsx(JSX hint 已在 22:00 merge 中被 origin 版覆蓋)
- 修改內容:本來打算在標題下方掛一行 i18n 提示「僅顯示前 N 個推薦」,當 `items.length > MAX_VISIBLE_TEMPLATES` 才出現。新增 `templateSelect.topNHint` key:en `"Showing top {n} recommendations"` / nb `"Viser de {n} beste anbefalingene"` / zh `"僅顯示前 {n} 個推薦"`。translations.js 的 key 還在,但 JSX 那行在 22:00 取 origin/main 版本時被覆蓋掉,要在後續重織 i18n 時手動補回。

## 2026-05-11 20:45
- 修改檔案:src/screens/TemplateSelectScreen.jsx、LOG.md
- 修改內容:在 visibleItems 計算後加上 `slice(0, 3)`,限制版型清單一次最多只顯示 3 個 pattern(取排序後最前面的三個,gender filter 仍照舊套用)。常數抽成 `MAX_VISIBLE_PATTERNS` 方便日後調整。(這個 commit 是在 fresh 那份 repo 上做的、推到 origin/main = 9e42e8f,功能上和 local 5/9 18:41 的 `MAX_VISIBLE_TEMPLATES` 重複,merge 後取 origin 版即只剩 MAX_VISIBLE_PATTERNS 名稱。)

## 2026-05-09 20:20
- 修改檔案:src/services/fabricAnalysis.js、vite.config.js
- 修改內容:布料檢測準確度修復(老師反映「檢測不準」)。問題根因在「送進 GPT-4o 的圖太爛」,不是 API 壞。
  1. **`detail: "low"` → `"high"`**(vite.config.js):GPT-4o vision 在 low 模式下不論輸入多大都會內部縮成 ~85×85 px,在這解析度下織紋(jersey vs woven vs twill)幾乎只能用先驗常識亂猜。high 模式會把圖切成 ~1568×768 的 tile,真的看得到紋理。代價:每次呼叫 token 數約 6×,但研究 prototype 用量低、不痛。
  2. **取消 300×300 中心裁剪、改成 1024 px 等比例 downscale**(fabricAnalysis.js):中心裁剪會把衣物輪廓資訊砍掉(分不出洋裝/襯衫),拍照時尺壓在中央(現在的尺校準流程!)會讓模型只看到尺。改成 `_downscale(maxPx=1024)`,送整張圖過去。
  3. **System prompt 升級**:加上「忽略尺/手/背景」、「無法判定就回 'Unknown',不要編造」、「具體一點,Twill 不要寫 woven」等規則。loosen `weight` enum、`texture` 提供 list of options + "Other"。`max_tokens` 400→600 留空間,`temperature` 0.1→0.2 不會卡死同一答案。
  4. **CACHE_PREFIX `v1_` → `v2_`**:讓使用者瀏覽器中的舊 cached 答案(用糊圖算的)失效,新流程一定 re-analyze。
  5. **新增 force re-analyze**:`analyzeFabric(file, { force: true })` 跳過 sessionStorage cache 強制重新呼叫。日後可以在 UI 加「重新分析」按鈕。
  6. **新增 dev log**:`[analyze] gpt-4o → {...}` 把每次 GPT-4o 實際回的 JSON 印出來,將來再 debug「為什麼這張識別錯」就有 ground truth。
- Smoke test:vite 自動 restart server 兩次成功;直接 curl `/api/analyze` 拿空白圖,模型誠實回「全 Unknown」(以前會自信亂猜)。
- 模型仍是 `gpt-4o`(不是 mini),沒換過,git 歷史可查。

## 2026-05-09 18:41
- 修改檔案:src/screens/TemplateSelectScreen.jsx
- 修改內容:測試模式限制 — TemplateSelectScreen 只顯示前 3 個改造方向。
  - 在檔案頂端新增常數 `MAX_VISIBLE_TEMPLATES = 3`(設為 null 即可關閉上限)
  - `visibleItems` useMemo 在性別過濾後再 `.slice(0, MAX_VISIBLE_TEMPLATES)`
  - 切片發生在 `items` 排序之後 — `items` 已先按 feasibility tier(可行 → 需襯料 → 不可行)、再按 compositeScore/fitScore 由高到低排序,所以「前 3 個」= 推薦度最高的 3 個
- 動機:做使用者研究時減少受試者認知負擔,聚焦在最相關的選項。
- 怎麼改回顯示全部:把 `MAX_VISIBLE_TEMPLATES` 改成 `null` 或刪掉那個常數+取消 slice 即可。
- Smoke test:HMR update 兩次成功;`localhost:5173` HTTP 200。

## 2026-05-09 18:36
- 修改檔案:src/screens/RulerCalibrationScreen.jsx
- 修改內容:修「上次加 zoom 後手機點不了」的 regression。`react-zoom-pan-pinch` 在 touch 裝置會 capture 並 swallow 所有 touch event 自己處理 pan/pinch,React 的 onClick 永遠不會在快點時觸發。
  - 移除 `<img onClick>`
  - 在包圖的 div 上改用 pointer events(`onPointerDown` / `Move` / `Up` / `Cancel`)
  - 自己判斷:移動 ≤ 6 px 且持續 ≤ 350 ms = tap → 放標記;否則交給 library 做縮放/平移
  - `e.isPrimary` 過濾多指輸入(pinch 的第二根手指)
  - `imgRef.getBoundingClientRect()` 縮放後仍正確反映 img 的實際視覺邊界,所以歸一化座標公式不變
- 動機:使用者手機測試回報「點不了」。
- Smoke test:Vite HMR 兩次 update 都成功;`localhost:5173` HTTP 200。

## 2026-05-09 18:34
- 修改檔案:src/screens/RulerCalibrationScreen.jsx、src/i18n/translations.js、package.json、package-lock.json
- 修改內容:RulerCalibrationScreen 加入 pinch-zoom + pan,解決手機點選不準的問題。
  1. **新依賴**:`react-zoom-pan-pinch@4.0.3`(輕量、業界標準、支援 pinch / wheel / pan)。
  2. **TransformWrapper / TransformComponent**:把照片+標記+連線都包進來,確保標記絕對定位仍跟著縮放。`maxScale: 8`、`doubleClick: disabled`(避免雙擊縮放跟「點兩下放標記」衝突)。
  3. **座標精度**:仍用 `imgRef.getBoundingClientRect()` 算歸一化座標 — 縮放後 rect 反映變換後的視覺邊界,所以「(clickX - rect.left) / rect.width」永遠是原始圖的歸一化 [0,1]。完全不必額外處理 transform 矩陣。
  4. **標記重設計**:外圈大環(7×7) 視覺辨識 + 中央十字準星(amber-300, 2px 線寬)+ 中心點(3×3) — 縮放放大後使用者仍能精確看到「測量點」在哪。number badge 移到右上角(-top-4 -right-4)避開準星。
  5. **Zoom 控制**:右下角浮動三顆按鈕(+ / − / ↺ reset),鼠在 TransformComponent 外因此不會被縮放。
  6. **i18n**:三語新增 `ruler.zoomHint`(「雙指縮放 · 拖曳平移 · 用 +/− 鈕微調」/「Pinch to zoom · drag to pan · use the +/− buttons for fine control」/「Klyp for å zoome · dra for å panorere · bruk +/− for finjustering」)。
- 動機:手機 Safari 上,夾在 55vh 螢幕的尺刻度點不準確。用戶報「點擊的不准」。Pinch-zoom 是工業標準解法。
- Smoke test:Vite 自動 detect 新依賴重新 pre-bundle、HMR 全綠;`http://localhost:5173/` HTTP 200;`react-zoom-pan-pinch` 模組 fetch 正常。

## 2026-05-09 18:24
- 修改檔案:src/services/measurements.js、src/hooks/useAnalysisPipeline.js、src/screens/AnalysisScreen.jsx、src/screens/UploadScreen.jsx、src/App.jsx、src/i18n/translations.js
- 新增檔案:src/screens/RulerCalibrationScreen.jsx
- 修改內容:加入「拍照時放尺」的 calibration 第三條路徑(老師建議,用以替代手量最長邊與 AR 量測)。對應 ImageJ-style 文獻方法(Song 2023 J. Clin. Med. 把 ImageJ 當 gold standard)。
  1. **measurements.js**:`computeMeasurements` 新增第 6 個可選參數 `scaleCmPerMaskPxOverride`。當 caller 提供時,直接覆寫原本由 `lengthGarment / bbox.heightPx` 推出的 scale。Backward-compatible — 原 5-arg 呼叫照常運作。
  2. **useAnalysisPipeline.js**:`run()` 新增 `rulerScale = { scaleCmPerImagePx, imageWidth }` 參數;在 `_measureAndCheck` 內把使用者點選兩點得到的「cm-per-natural-image-px」轉成「cm-per-mask-px」(乘以 `imageWidth / maskW`,因為 mask 是等比例 downscale),再傳給 `computeMeasurements`。`scaleCmPerImagePx > 0` 也能單獨成立、不再強制要 `lengthGarment`。
  3. **RulerCalibrationScreen**(新):全螢幕顯示拍好的衣物照,使用者點兩下標出尺上兩個位置(座標以歸一化 [0,1] 存,圖片 layout 變動也對得齊),輸入「兩點之間 X cm」,確認後算出 `scaleCmPerImagePx = cm / sqrt((dx*W)² + (dy*H)²)` 並 `navigate("analysis", { ..., scaleCmPerImagePx, imageWidth })`。視覺:amber-400 的點+連線,跟 secondary-300 的 AR 區隔。
  4. **UploadScreen.jsx**:在 AR 按鈕底下加一顆 📐「Use ruler in photo」按鈕(深色 bg-primary-800 與 AR 的 secondary-300 視覺對比),點擊時 `navigate("rulerCalibrate", { image, imageFile, hasLayers })`。
  5. **App.jsx**:新增 `scaleCmPerImagePx` / `imageWidth` 兩個 state,新增 `rulerCalibrate` screen route,把這兩個值轉給 AnalysisScreen。
  6. **i18n**:三語(en/nb/zh)新增 `upload.rulerOptionTitle/Hint` 與整個 `ruler.*` namespace(title / hintTapFirst / hintTapSecond / hintEnterCm / knownDistanceLabel / placePointsCta / enterCmCta / confirmCta / noImage)。
- 動機:老師建議拍照時加尺更精準。學術定位 = ImageJ 校準物路線(Song et al. 2023 *J. Clin. Med.* 把 ImageJ 當 gold standard、AR Ruler app 也只要求達到同等精度);也讓沒 LiDAR 的 iPhone / Android 都能用,提高 study 的可及性。
- Smoke test:dev server HMR 全部 update 成功,`http://localhost:5173/` HTTP 200,新模組可被 import。既有 `segmentation.test.js` / `feasibility.test.js` 11 個失敗是先前 stale tests 打到已棄用的 panel-breakdown API,跟此次變更無關(本次改的檔案沒對應 unit test)。
- 待辦:(a) 用真實照片+尺實測精度;(b) `ArMeasureScreen` 退成「進階選項」可考慮;(c) 之後若加自動尺偵測,基礎已經在了(只要用同一條 navigate path 帶 scaleCmPerImagePx 即可)。

## 2026-05-03 23:40
- 修改檔案:src/services/fabricProfile.js、src/services/previewGeneration.js、src/services/feasibility.js(間接)、vite.config.js、api/preview.js
- 修改內容:修兩個 i18n 後續引發的回歸 bug,以及 Gemini 預覽圖偶發失敗。
  1. **mockAnalysis 物件化打破下游服務:** i18n 把 `mockAnalysis.fabric.texture / weight / condition / composition[].material` 改成 `{en,nb,zh}` 物件後,`fabricProfile.js` 的 `.toLowerCase()` 對物件會炸,`previewGeneration.js` 的字串模板會輸出 `[object Object]`。加 `asEnString()` / `enStr()` 內部 helper,匹配與 prompt 一律取英文(語言無關的內部邏輯,英文當 canonical key)。`feasibility.js` 透過 `getFabricProfile` 也跟著修好。症狀:每張上傳的圖布料分析結果都一模一樣 — 因為 pipeline 走到 mock 時會 throw,被吃掉後就沒呼叫 `setFabric`,使用者永遠看到 mock 的「棉質布料 / 深藍 / 85% 棉 15% 聚酯」。
  2. **Gemini NO_IMAGE 直接 fall back 到 Pollinations:** 某些 template prompt 會被 `gemini-2.5-flash-image` 用 `finishReason: "NO_IMAGE"` 拒絕(內容政策過濾),先前 `tryPollinations` 在有 image 時會直接 return null,等於沒有 fallback。改為:client 上傳圖時除了 img2img prompt 之外多送一份 `fallbackPrompt`(`_buildPrompt(fabric, template, false)` 純文字版,沒有「in this image」自我參照);server 端 Gemini 失敗就改打 `tryPollinations(fallbackPrompt, seed, null)`(image 強制 null,Pollinations FLUX 沒 img2img 但會根據文字產出。代價:不會保留原布料花紋,Pollinations 的視覺風格也跟 Gemini 不同,但至少有圖)。Log 加上 finishReason 標記,下次失敗一眼可辨。
- vite.config.js 改了所以 dev server 已重啟。Smoke test:`npm run build` 仍乾淨;測試流程在瀏覽器 console 清 `preview_v1_` localStorage cache 後重新開 TemplateSelectScreen 等所有版型生成。

## 2026-05-03 16:55
- 修改檔案：scripts/build-methodology-deck.cjs、docs/ahci-5-5-research-methodology.md、docs/fashion-flipper-methodology.pptx（重建）
- 修改內容：根據 Lene 訪談原檔反推 Formative #1 實際 methodology，更新 Slide 2。重點修正：(1) 名稱從「Pile-of-Guilt」改為「Sewer Practices, Pain Points & Concept Reactions」，因實際內容遠超出單一 bottleneck；(2) Method 從「semi-structured + object elicitation」改為「semi-structured + embedded concept walkthrough」——實際是中段讀 sales pitch 給受訪者聽（pitch 文本在 Lene 檔 line 120-126），不是物件導引；(3) Tasks 改為 7-section script 列表；(4) Metrics 改為實際捕捉的 themes（pile-of-guilt、fabric-ID 焦慮、fitting 痛點、功能優先序、付費意願、deal-breakers）；(5) Analysis 加入「pitch 前段當 formative findings、pitch 後段當 concept validation」的分析切分；(6) Participants 改為「5 done: Lene/Claire/Yuqing/Mona/Linda」+ 標註全為 intermediate 以上、還缺 3 位 beginner 純 formative。Markdown 同步。

## 2026-05-03 16:25
- 修改檔案：scripts/build-methodology-deck.cjs、docs/ahci-5-5-research-methodology.md、docs/fashion-flipper-methodology.pptx（重建）
- 修改內容：Design Iter #2「Gen-AI Quality Evaluation」改成 dual-perspective 設計——理由是只請裁縫師評布料準確度會漏掉 Fashion Flipper 的核心 contribution claim「novice-accessible pattern recommendations」。新版同時收 8 tailors + 8 beginners (n=16)：tailor 評布料準確度/pattern–布料適配/新手可達性/步驟完整性，beginner 評自覺可行性/preview 真實感/嘗試意願。Likert 從 4 維（realism/trust/helpfulness/specificity）擴成 6 維（fabric accuracy / project-fabric fit / novice accessibility / step completeness / visual realism / overall trust）。分析方法加「expert/novice convergence-divergence analysis」。Slide 5 Q4 同步更新；Q5 加註「matches GreenAR CHI 2026 Best Paper」。

## 2026-05-03 15:53
- 修改檔案：scripts/build-methodology-deck.cjs（新增）、docs/fashion-flipper-methodology.pptx（新增）
- 修改內容：用 pptxgenjs 把 ahci-5-5-research-methodology.md 內容打包成 6-slide 全英文 pptx（widescreen 13.33×7.5），可直接上傳 Google Slides。配色 Warm Terracotta 系（primary #B85042 + sand #F8F6EE + sage 高亮列）；Georgia 標題 + Calibri body；Slide 1 dark 標題封面、Slide 2-4 各階段 8-col study table、Slide 4 加 Pinterest/YouTube baseline 理由 callout、Slide 5 5 個 key design questions、Slide 6 references。Design Iter #2（Gen-AI Quality Eval）和 Summative 用 sage 色高亮。執行：`node scripts/build-methodology-deck.cjs`。

## 2026-05-03 15:33
- 修改檔案：docs/ahci-5-5-research-methodology.md（新增）
- 修改內容：依 AHCI 5/5 投影片兩項 deliverables 整理研究方法文件——三階段 study summary table（Understand / Design / Evaluate）+ 5 個關鍵設計問題（含證據層級）。Design Iter #2 設計成 Gen-AI Quality Evaluation vs Pinterest/YouTube（mirror RoomDreaming 結構）；Summative 比較條件改為 Pinterest+YouTube 工作流 baseline（mirror MR.Drum 結構，且 Pinterest/YouTube 是 Slide 32 列的 current workaround，比 ReStitch 更具生態效度）。Reference paper 對應 Sung et al.、Cheatle & Jackson、MR.Drum、RoomDreaming、Ji et al.、CSI（Cherry & Latulipe）。

## 2026-05-03 (三語 i18n 完工)
- 修改檔案:src/i18n/LanguageContext.jsx(新增)、src/i18n/translations.js(新增)、src/main.jsx、src/components/PhoneFrame.jsx、src/components/BottomNav.jsx、src/components/MeasurementsModal.jsx、src/components/GlossaryTerm.jsx、src/components/ArOverlays.jsx、src/screens/* (14 個全改)、src/data/templates.js、src/data/communityPosts.js、src/data/mockAnalysis.js、src/data/glossary.js、src/data/tutorials.js、src/data/arTutorials.js、src/data/fabricRequirements.js、src/data/measurementPresets.js、src/services/feasibility.js、src/patterns/bag.js、src/patterns/hat.js、src/patterns/noSewTote.js、src/utils/measurementValidation.js
- 修改內容:三語(英 / 挪威語 Bokmål / 繁體中文)切換完工。`LanguageContext` 提供 `lang / setLang / t(key, params) / tl(field)`,localStorage 鍵 `ff_lang_v1` 保存選擇,支援 `{name}` 參數插值。`PhoneFrame` 右上角加 EN / NO / 中 三鍵切換;`translations.js` 集中所有 UI 文案 key(home / upload / analysis / templateSelect / stepGuide / result / community / learn / profiles / profileEditor / arMeasure / arPattern / arTutorial / patternLayout / measurementsModal / measurements / measurementGroups / validation / common / nav 等命名空間)。資料檔的字串欄位(templates name / style / time / description / materials、tutorials title / steps、arTutorials labels、glossary definitions、mockAnalysis fabric / tags、measurementPresets label、fabricRequirements reason、feasibility note、patterns 的 piece label 與 step title-description-tip-duration、communityPosts item / tag)全部改成 `{ en, nb, zh }` 物件,顯示時用 `tl()`。`measurementValidation.js` 的 `humanise()` / `validateField()` 接受 optional `t` 參數(沒傳則回退英文)。`MEASUREMENT_GROUPS` 仍以英文鍵儲存(用作 lookup),顯示時透過 `t('measurementGroups.<key>')` 翻譯。Smoke test:`npm run build` 成功(608 modules),dev server 啟動,所有 14 screens + 5 components vite transform 皆回 200。

## 2026-05-02 15:00
- 修改檔案：src/services/previewGeneration.js、src/data/templates.js
- 修改內容：把 image-to-image 套用到所有版型，不再只限 noSewTote。移除 `template.useSourceImage` 旗標（已是 dead flag），改成「只要 caller 有傳 imageFile 就走 image-to-image」。`_buildPrompt` 在有 source image 時改用新 default prompt — `Reimagine the garment in this image as {visualDescription}`，並加上「保留原 fabric / color / 正面圖案 / print / logo / text，同 hue 同 placement」的強制指示。沒有 image 時退回原本 flat-lay 純文字 prompt。`previewPromptOverride` 機制保留（noSewTote 仍用客製 prompt 描述 slouchy + fringe + 打結）。

## 2026-05-02 14:30
- 修改檔案：src/services/previewGeneration.js、vite.config.js、api/preview.js、src/data/templates.js、src/App.jsx、src/screens/ResultScreen.jsx、src/screens/TemplateSelectScreen.jsx
- 修改內容：noSewTote 的 preview 改用 image-to-image。新增 `template.useSourceImage` + `template.previewPromptOverride` 兩個欄位（目前只 noSewTote 開），把用戶上傳的 T-shirt 照片下採樣到 768px JPEG/0.85 後當 inline image 送給 Gemini 2.5 Flash Image，prompt 強制要求「保留原 T-shirt 正面圖案、顏色」。`/api/preview` 從 GET querystring 改成 POST JSON body（`{prompt, seed, image?}`），cache key 加上 image hash 避免不同衣服共用 cache。Pollinations FLUX 沒 image-to-image，server 在有 image 時直接跳過 fallback。其他版型不傳 imageFile，行為跟舊版一樣。

## 2026-04-06
- 修改檔案：LOG.md（新增）
- 修改內容：初始化專案執行手冊與變更日誌

## 2026-04-06
- 修改檔案：src/screens/PatternLayoutScreen.jsx（新增）、src/data/mockAnalysis.js、src/data/templates.js、src/App.jsx、src/screens/TemplateSelectScreen.jsx、src/screens/StepGuideScreen.jsx、src/screens/AnalysisScreen.jsx
- 修改內容：根據用戶反饋新增「Pattern Layout」步驟——在 Cut the Fabric 之前顯示衣物簡化輪廓底圖（含布紋方向線）與 AI 自動排版的圖紙，用戶可拖移各圖紙調整位置；布紋方向分析結果同步顯示於 AnalysisScreen

## 2026-04-06
- 修改檔案：src/data/mockAnalysis.js、src/data/templates.js、src/screens/PatternLayoutScreen.jsx
- 修改內容：根據用戶反饋調整 Pattern Layout 底圖——改為米白色紙版風格；bag handle strip 寬度改為與 body 相同（35cm）、長度加長至 70cm；重新排版三件圖紙位置；衣物高度調整為 100cm 以容納新尺寸

## 2026-04-06
- 修改檔案：src/data/tutorials.js（新增）、src/screens/BasicTutorialScreen.jsx（新增）、src/components/BottomNav.jsx、src/App.jsx、src/data/mockAnalysis.js、src/screens/PatternLayoutScreen.jsx
- 修改內容：新增「Sewing Basics」學習模組——4 個類別（縫紉機使用、基本縫法、縫鈕扣、縫拉鍊），共 21 個步驟，可逐步打勾完成；BottomNav 新增第 4 個 Learn tab；Pattern Layout 底圖改為雙 T-shirt SVG 輪廓（FRONT/BACK）

## 2026-04-16
- 修改檔案：docs/related-work-draft.md（新增）、docs/study-design-v2.md（新增）
- 修改內容：深度分析 Research Brief 文獻，整理 28 篇相關參考文獻並撰寫 CHI 論文 Related Work section 草稿（4 小節：Material Recognition、CST for Making、Sustainable Fashion、Computational Pattern Design）；重新設計 comparative study（改為 within-subjects 16-20 人、明確控制組定義、加入 CSI 量表與 fabric accuracy validation）

## 2026-04-19 22:51
- 修改檔案：docs/proposal-v2.md（新增）
- 修改內容：依 AHCI 課程 proposal 五段式架構（Problem／Current solutions／Our approach／Validation／Contributions）撰寫 v2，融合 3/31 v1 pptx 的永續背景與三大功能命名（Smart Scan／Pattern Breakdown／Duolingo-style Guidance），以及 4/14 markdown 的 formative study（4 使用者 + 1 專家訪談）、競品分析與 comparative study 設計；加入 Fabric-aware × Novice-accessible 二維定位圖，凸顯右上象限為空缺

## 2026-04-26
- 修改檔案：presentation.html（新增）
- 修改內容：用 editable-deck skill 從 template 拷貝產出 5 頁 dashed 手繪風 HTML 簡報（封面 / 背景與動機 / 系統設計使用者流程 / 四階段 AI Pipeline / 研究貢獻），DRAFT_KEY 設為 fashion-flipper-slides-draft-v1，按 E 進編輯模式、Cmd/Ctrl+S 下載含改動的 HTML

## 2026-04-28 11:21
- 修改檔案：api/preview.js、vite.config.js、.env.local（新增）
- 修改內容：preview 圖片生成主後端改為 Gemini（gemini-2.5-flash-image），Pollinations FLUX 降為 fallback；兩端（Vercel serverless 與 vite dev middleware）皆採「先試 Gemini，失敗再打 Pollinations」順序，seed 同時傳給兩者；新增 .env.local 樣板含 GEMINI_API_KEY 與 POLLINATIONS_KEY 兩個欄位

## 2026-04-28 11:35
- 修改檔案：vite.config.js、api/analyze.js
- 修改內容：修掉 /api/analyze 的錯誤遮蔽——原本不論上游回什麼都統一回 "Empty response from model"，看不到真正原因；現在 (1) upstream 非 200 時直接回傳上游 status + raw body，(2) 200 但 content 為空時回傳 finish_reason 與整包 raw response 方便診斷（content filter / quota / token 失效等），dev middleware 與 Vercel handler 皆同步修正

## 2026-04-28 12:05
- 修改檔案：src/screens/TemplateSelectScreen.jsx、vite.config.js
- 修改內容：(1) TemplateSelectScreen 拿掉 hasGeneratedPreviews useRef guard——這個 guard 在 React StrictMode 下會 race condition：第一次 mount 設成 true 後 cleanup 把 cancelled 設 true，第二次 mount 看到 ref 是 true 直接 return，導致大部分版型的預覽圖永遠不會 setState。改為純 cancelled 模式，靠 generatePreview 內建的 _inFlight + localStorage 防重複 API 呼叫；(2) vite.config.js 的 preview middleware 加上 [preview] 開頭的耗時與錯誤 log，方便 dev 時看每張圖走 Gemini 還是 Pollinations

## 2026-04-28 12:30
- 修改檔案：src/screens/TemplateSelectScreen.jsx
- 修改內容：版型卡縮圖加上長按放大功能——按住 400ms 後跳出全螢幕黑背景 modal 顯示完整預覽圖，點擊背景關閉；用 Pointer events 同時支援滑鼠與觸控，stopPropagation 避免觸發外層 card 的「進入版型」點擊行為

## 2026-04-28 12:40
- 修改檔案：src/screens/TemplateSelectScreen.jsx、src/services/previewGeneration.js
- 修改內容：三件防呆——(1) items useMemo 篩掉 feasible === false 的版型，做不出來的不顯示也不浪費 API 配額；(2) preview 生成迴圈加 previewsRef 機制，HMR 重 mount 時若 state 已有 preview 直接 continue，不再重複呼叫 generatePreview；(3) previewGeneration.js 改用 _saveCacheWithEviction：localStorage 寫入失敗（quota 5MB 撞滿）時，先 evict 其他 fabricHash 的舊 cache，再重試；還是失敗就丟一個目前 fabric 的舊 entry 再試一次，避免靜默 swallow QuotaExceededError 後 cache 永久失效

## 2026-04-28 12:55
- 修改檔案：src/screens/TemplateSelectScreen.jsx
- 修改內容：長按放大功能加上可發現性提示——(1) 列表頂端加一條 pill 樣式的提示「Long-press any preview image to enlarge」含小放大鏡 SVG icon；(2) 每個版型縮圖右下角疊一個 16×16 半透明黑底圓 + 白色放大鏡 icon 作為持續視覺提示，pointer-events-none 不擋長按事件

## 2026-05-01 19:51
- 修改檔案：src/hooks/useDeviceOrientation.js（新增）、src/screens/ArMeasureScreen.jsx（新增）、src/App.jsx、src/screens/UploadScreen.jsx
- 修改內容：新增 WoZ AR 測距畫面取代 UploadScreen 原本的「最長邊 cm」數字輸入。設計參考 Apple 測距儀：相機背景 + 中央十字 reticle + 黃色 + 圓鈕放點 + 黃色虛線/實線連接 + 中點 chip 顯示 cm + Reset/Done。距離以螢幕像素 × 校準常數（5.6 px/cm）+ 隨機抖動 ±0.7cm，clamp 到 20–180cm 範圍。useDeviceOrientation hook 包 DeviceOrientationEvent（含 iOS 13+ requestPermission 流程），用陀螺儀 Δgamma/Δbeta × 6 px/deg 對已放置端點做小幅補償，模仿 ARKit 空間錨點貼合感；不支援 / 未授權時自動退化為純螢幕座標。Flow：Upload（純照片）→ ArMeasure → Analysis

## 2026-05-01 20:25
- 修改檔案：vite.config.js、src/screens/ArMeasureScreen.jsx、src/hooks/useDeviceOrientation.js（刪除）
- 修改內容：(1) vite.config.js 加 server.allowedHosts: ['.trycloudflare.com', '.ngrok.io', '.ngrok-free.app']，方便用 cloudflared / ngrok 開 HTTPS tunnel 給手機測相機 API（getUserMedia 需要 secure context）；(2) ArMeasureScreen 互動模型重寫——原本 Apple 風的「中央 reticle + 按 + 鈕放點」在實測有兩個問題：桌機按 + 兩次都在同位置（reticle 跟著滑鼠移到按鈕上）導致距離一直被 clamp 到 20cm 下限、手機上 + 鈕命中區小且看不到拖線回饋。改成 drag-to-measure：在畫面上按住拖曳一條線、放開即測量完成（觸控 + 滑鼠統一邏輯），<60px 視為意外點擊取消；reticle、+ 鈕、useDeviceOrientation hook（陀螺儀補償）一併移除——drag 在 1 秒內完成，手機沒時間移動，gyro 補償變成 dead code。視覺仍維持 Apple 風的黃線 + 白圓端點 + 距離 chip；ready 階段加四角 viewfinder 框 + 中央「Tap & drag」提示。按鈕加 stopPropagation 避免點按鈕觸發拖曳。

## 2026-05-01 20:48
- 修改檔案：src/hooks/useDeviceOrientation.js（重新加回）、src/screens/ArMeasureScreen.jsx
- 修改內容：補上「測完線會貼在衣物上」的視覺錨定感——使用者反映 drag 完之後手機微移、線會跟著動，不像 Apple Measure 黏在物體上。重新引入 useDeviceOrientation hook，於 done 階段把整條線當剛體，根據 Δgamma / Δbeta × 6 px/deg 反向位移，模擬 ARKit 旋轉補償。compensation 只在 phase === "done" && permission === "granted" && anchorOrient 存在時生效，避免 iOS 權限尚未 granted 時 anchor 為 0 導致首次測量結果跳位。pointerdown 觸發 requestPermission（fire-and-forget，iOS 13+ 必須在 user gesture 內呼叫）。桌機 / 不支援 / 拒絕權限時無感降級為純螢幕鎖定。

## 2026-05-01 21:18
- 修改檔案：src/screens/ArMeasureScreen.jsx
- 修改內容：加入參考物校準步驟解決 WoZ 測距不準問題（純像素 × 手調比例 ±10cm 飄移）。改成兩階段流程：(1) Calibrate 階段——使用者把信用卡 / 健保卡 / 身分證（ISO/IEC 7810 ID-1，長邊 = 8.56 cm）放進畫面，沿長邊拖曳一條線，計算真實 px/cm 比例；(2) Measure 階段——用校準後的比例量衣物。校準正常時準度可達 ±3%（真實幾何，非 WoZ）。視覺上以青色 (#00D4FF) vs 黃色 (#FFCC00) 區隔兩階段；測量畫面 top bar 顯示「✓ X.X px/cm」校準徽章。Skip 鈕保留純 WoZ fallback 路徑（用 DEFAULT_PX_PER_CM 5.6），Recalibrate 按鈕讓 Step 2 可回到 Step 1。Done 鈕在 calibrate 階段變成 Continue →，按下時鎖定校準值並切到 measure 階段。

## 2026-05-01 21:42
- 修改檔案：src/App.jsx、src/screens/ArMeasureScreen.jsx、src/screens/CameraPatternScreen.jsx
- 修改內容：把 ArMeasure 學到的 calibPxPerCm 接到 AR Pattern 顯示畫面 + 加陀螺儀錨定。(1) App.jsx 加 calibPxPerCm state，navigate 收 data.calibPxPerCm 同步存；(2) ArMeasureScreen confirmMeasurement 把 calibPxPerCm 一起塞給 navigate；(3) CameraPatternScreen 接收 calibPxPerCm prop，pixelsPerCm 優先用真實校準值（裁片以真實物理大小呈現，非相對 fit-to-screen），原 longestSideCm fit-to-screen 與 PIECE_SCALE_FALLBACK 降為 fallback；(4) CameraPatternScreen 接 useDeviceOrientation，phase 切到 ready 時 snapshot anchorOrient，把 GrainOverlay + 所有 CameraPiece 包進一個 transform: translate(offX, offY) 的 div，整層當剛體跟著 Δgamma/Δbeta × 6 px/deg 反向位移；(5) Top bar 「Grain detected」徽章右側加上青色 px/cm 校準值顯示。

## 2026-05-01 23:10
- 修改檔案：src/hooks/usePinchScale.js（新）、src/screens/ArMeasureScreen.jsx、src/screens/CameraPatternScreen.jsx、src/screens/ArTutorialScreen.jsx
- 修改內容：加入雙指捏合手動縮放，作為「靠近遠離 AR 不變動」的 WoZ 解法（純網頁拿不到深度感測器，沒有 SLAM 級的自動 distance scaling）。usePinchScale hook 監聽 touchstart/move/end 雙指距離，用兩指距離比 × 初始 scale 算出 0.5–2.5× 縮放，preventDefault 避免頁面滾動 / 系統 zoom；單指手勢完全不影響、原有 drag 邏輯不動。三畫面接法：(1) ArTutorialScreen wrapper 加 scale，每個 step 切換時 resetScale；(2) CameraPatternScreen 既有 transform wrapper 加 scale 因子；(3) ArMeasureScreen 重構把 line+endpoints+chip 包進統一 transform wrapper（之前是各自 absolute），同時拿掉 renderStart/renderEnd 偏移計算改由 wrapper 負責；offset/scale 改在 wrapper 集中管理也讓 anchor 補償邏輯更乾淨。pinch 只在 phase === "done"（ArMeasure）或 "ready"（其他兩個）時 enabled，避免拖曳中縮放破壞 finger=endpoint 對應。Top bar 加青色 `1.40×` chip（scale 不為 1 時顯示，點擊歸零）。

## 2026-05-01 23:25
- 修改檔案：src/hooks/usePinchScale.js
- 修改內容：補桌機縮放支援——usePinchScale hook 新增 wheel 事件處理，當 ctrlKey 或 metaKey 同時按下時 preventDefault 並用 `Math.exp(-deltaY × 0.01)` 算 scale factor。這同時支援三種桌機操作：(1) macOS trackpad 雙指捏合（瀏覽器自動轉成 wheel + ctrlKey: true 事件）、(2) Mac 上 Cmd + 滾輪、(3) Windows / Linux 上 Ctrl + 滾輪。沒按修飾鍵的純滾動完全不受影響（保留正常頁面滾動）。

## 2026-05-02 00:08
- 修改檔案：src/components/ArOverlays.jsx
- 修改內容：把兩袖 J 線底部的勾改為**向外**彎（遠離中央）。原本是 `xL + hookPx` / `xR - hookPx` 兩邊都往內、左右一翻就成直立 U；現在 `xL - hookPx` / `xR + hookPx`，左袖底端往左勾、右袖底端往右勾，視覺上更像衣物兩側往外延伸的剪裁路徑。

## 2026-05-02 00:30
- 修改檔案：src/components/ArOverlays.jsx、src/screens/ArTutorialScreen.jsx
- 修改內容：修兩個 drag 相關 bug：(1) **桌機拖完卡死**——原本 setPointerCapture + 在 e.currentTarget 加 listener 的寫法在 React synthetic event 釋放後 `e.currentTarget` 變 null，導致 removeEventListener 失敗、listener 永遠掛著、後續 click 都沒效。改成全部用 `window.addEventListener("pointermove"/"pointerup"/"pointercancel")` 模式（CutSleeveOverlay 兩個 handler、FringeMarksOverlay 一個），native 事件直接在 window 上處理，cleanup 一定執行；(2) **Step 3 不能拖**——KnotPairsOverlay 之前只支援點 chip toggle，沒有重新對齊整個 cluster 的方式。新增 `onTranslateInherited` prop + 一個透明 drag-grab area 覆蓋在 ticks 區（chip 排除在外不擋點擊），拖動時更新 inherited（step 2）的 offset，讓 step 3 與 step 2 共用同一份 fringe 位置且自動同步。

## 2026-05-02 00:55
- 修改檔案：src/components/ArOverlays.jsx
- 修改內容：Step 1（剪領 + 兩袖）整體可拖曳。CutSleeveOverlay 加 `dxAll` / `dyAll` 兩個全域偏移欄位（與既有 `dxLeft`/`dyU` 並存），所有座標都疊加 dxAll/dyAll → 拖整組會同時平移 U 跟兩條 J。新增 handleClusterDrag + 一塊覆蓋三條 cut 邊界框（±12px padding）的透明 grab 區，DOM 順序放在 SVG 與 handles 之前，所以點到 handle 時仍由 handle 接管（mirror 鏡像袖、垂直拖領口）；拖曳空白處則平移整組。

## 2026-05-02 01:10
- 修改檔案：src/components/ArOverlays.jsx、src/data/arTutorials.js
- 修改內容：依使用者反饋調整 neckline 線型——(1) 寬度從 16cm 加大到 22cm（更接近真實大 U 領口）；(2) 深度從 6cm 改為 17cm，等於 J 線直線段長度（lengthCm × 0.7 = 16.8cm），neckline 底部 y 與 J 開始彎曲處對齊；(3) U 路徑改為「平底圓角」造型——M xNL yNT → L 直線下行 → Q 圓角彎入 → L 平底橫線 → Q 圓角彎出 → L 直線上行，corner radius 取寬度與深度較小的 30%/40%。視覺上像 wide rectangular scoop neckline 而非淺淺的曲線。

## 2026-05-02 03:00
- 修改檔案：src/screens/ArMeasureScreen.jsx、src/screens/ArTutorialScreen.jsx、src/components/ArOverlays.jsx
- 修改內容：四個 cleanup（review 9–12）：(9) 拿掉 ArMeasureScreen 的 `function reset() { clearMarks() }` 空殼，Reset 按鈕改直接 onClick={clearMarks}；(10) ArTutorialScreen 從 `usePinchScale` 解構刪掉沒用到的 `isScaling`；(11) ArTutorialScreen 把 local `FALLBACK_PX_PER_CM` 改成 `DEFAULT_FALLBACK_PX_PER_CM`，pxPerCm 計算改成 `calibPxPerCm ?? tutorial.fallbackPxPerCm ?? DEFAULT_FALLBACK_PX_PER_CM`，原本 arTutorials.js 每個 tutorial 帶的 `fallbackPxPerCm: 5.6` 從 dead 變成有效設定；(12) ArOverlays.jsx CutSleeveOverlay 的 dragOffset 註解從 stale 的 `{ dxLeft, dyU }` 更新為 `{ dxLeft?, dyU?, dxAll?, dyAll? }` 反映加上 cluster translate 後的真實 shape。

## 2026-05-02 02:45
- 修改檔案：src/screens/ArMeasureScreen.jsx、src/screens/CameraPatternScreen.jsx、src/screens/ArTutorialScreen.jsx、src/components/ArOverlays.jsx
- 修改內容：根據 code review 修六個真 bug：(1) **ArMeasureScreen** 把 `setPointerCapture` + JSX onPointerMove/Up 換成 window 層級 listener，pointermove/up/cancel 在 pointerdown 內 install 並於 onUp 內 cleanup，避免和 ArOverlays 一樣的「桌機 React event 釋放後 currentTarget 變 null、listener 永遠掛著」bug；同時加 `orientationRef` 確保 onUp 拿到的是 fresh orientation 不是 stale closure 值；(2) **CameraPatternScreen** 把 piece drag 同樣改成 window listener，不再 setPointerCapture 在 piece div、listener 卻在 container 的不一致；(3) **ArMeasureScreen** live cm chip 還在用 `backdropFilter: blur(8px)` 而且在 scaled wrapper 裡，iOS Safari 縮放會閃，改成更實的 rgba(0,0,0,0.78)（之前 ArOverlays.chipStyle 已修但漏了這份）；(4) **ArTutorialScreen** anchor snapshot effect 加 `orientPerm === "granted"` gate，沒授權時 setAnchorOrient(null) 而不是抓 stale {0,0,0}，避免第一次 reading 時線跳掉；(5) **ArOverlays** `calloutPulse` keyframe 中間多寫一個 `;` 把 box-shadow 拆斷，第二個陰影根本沒生效，改成正確的 `,` 分隔；(6) **ArTutorialScreen** `handlePrev` 拿掉 `setCompletedPairs(new Set())`，原本從 step 3 倒回 step 2 會把使用者已標記完成的打結進度全清掉，方向反了。

## 2026-05-02 02:10
- 修改檔案：src/data/arTutorials.js、src/components/ArOverlays.jsx、src/screens/ArTutorialScreen.jsx、src/screens/BasicTutorialScreen.jsx、src/App.jsx
- 修改內容：把 Learn 第一個項目「Sewing Machine Basics」做成 AR-guided tutorial。設計上沒辦法做機器零件視覺辨識（無 CV），改成 WoZ「numbered callouts on camera view」風格——每步在畫面固定位置 overlay 編號圓圈 + 標籤 + 連接箭頭，使用者用相機角度自己對齊機器零件。新增 NumberedCalloutOverlay 通用組件（用 SVG markers 畫 dashed 連接箭頭、line endpoints inset 22px 不被圓圈擋、circles 加 calloutPulse keyframe 動畫）。5 步配置寫在 arTutorials.js（Wind Bobbin 3 點 / Thread Upper 5 點 / Insert Bobbin 1 點 / Set Length+Tension 2 點帶 value chip / Start+End Seam 4 點帶箭頭符號）。Tutorial config 新增 `backTarget`（控制返回 navigate）+ `doneTarget`（控制最後一步的去向，noSewTote→result，sewingMachine→learn）。ArTutorialScreen 接 `from` prop（App.jsx 用 arTutorialFrom state 在 navigate 時 capture），所有返回路徑改用 backTarget；denied splash 「View text steps instead」按鈕只在 templateSelect flow 顯示。BasicTutorialScreen 在 machine category 展開時最上方加一顆青綠 CTA「🪡 Try AR-Guided Walkthrough」→ navigate("arTutorial", { template: "sewingMachine", from: "learn" })。

## 2026-05-02 01:35
- 修改檔案：src/components/ArOverlays.jsx、src/screens/ArMeasureScreen.jsx、src/screens/CameraPatternScreen.jsx、src/screens/ArTutorialScreen.jsx、src/hooks/usePinchScale.js
- 修改內容：修 iOS Safari 縮放時 AR overlay 一閃一閃的 bug，三管齊下：(1) chipStyle 拿掉 `backdrop-filter: blur(8px)`，背景改為更實的 rgba(0,0,0,0.78)——backdrop-filter 在 transform 父層內是 iOS Safari 已知 layer compositing bug；(2) 三個畫面 AR wrapper 從 `transform: translate(...) scale(...)` 改成 `translate3d(...) scale3d(...)`，強制 GPU 加速並用 backfaceVisibility: hidden 鎖定 layer；(3) usePinchScale hook 用 requestAnimationFrame coalesce 多次 touchmove 為每幀最多一次 React 更新（pendingScale 暫存 + flushScale），消除 sub-frame thrash。同時拿掉 `willChange: "transform"`，因為某些 Safari 版本對 will-change 持久 layer 有 bug。

## 2026-05-01 23:55
- 修改檔案：src/data/arTutorials.js、src/components/ArOverlays.jsx、src/patterns/noSewTote.js
- 修改內容：Step 1 從「兩條斜剪線」改成「領口 U + 兩袖 J」三條曲線，更貼近真實 no-sew tote 的剪裁路徑。資料結構：sleeves.{left,right} + neckline.{yTopNorm,widthCm,depthCm}（領口 16×6cm，可獨立調整）。CutSleeveOverlay 重寫為單一全螢幕 SVG 渲染三條 dashed paths：(1) leftJ 直線下行 70% 後 Q-curve 內彎；(2) rightJ 鏡像；(3) U 用 quadratic Q 從左肩到右肩，最低點在中央。每條 path 用 SVG `<animateMotion>` + mpath 做剪刀沿線動畫，比之前的 CSS keyframe 垂直走更貼合曲線。Drag handles：兩袖各兩顆（top + 0.7L 處）、領口一顆（U 最低點，垂直拖動調整 yTopNorm）；袖子拖曳維持鏡像連動。Length chips 改放兩袖的外側不擋線；領口加 `Neckline · 16×6 cm` 標籤。文字 fallback (patterns/noSewTote.js) 同步更新描述。

## 2026-05-01 22:30
- 修改檔案：src/data/arTutorials.js（新）、src/patterns/noSewTote.js（新）、src/components/ArOverlays.jsx（新）、src/screens/ArTutorialScreen.jsx（新）、src/data/templates.js、src/data/fabricRequirements.js、src/data/patternAreasBySize.js、src/App.jsx、src/screens/TemplateSelectScreen.jsx、src/screens/UploadScreen.jsx
- 修改內容：新增「T-shirt → No-Sew Tote」AR-guided 三步驟版型，解決 50cm T-shirt 在 TemplateSelect 無版型可選的問題。三步驟：(1) 剪袖（左右兩條鏡像剪線 + 端點拖曳），(2) 下擺剪 12 條流蘇（用 calibPxPerCm 算 8cm 真實深度 + 2.5cm 真實間距），(3) 6 對打結（繼承 step 2 幾何 + 編號 chip + 點擊變綠勾完成）。AR overlay 全程靠 transform translate(offX, offY) 整層做剛體陀螺儀錨定（同 CameraPatternScreen 機制）；step 3 為「手機放桌上雙手打結」模式，gyro 補償自動關閉。新版型 patternSource: "ar-tutorial" 觸發 TemplateSelectScreen 兩處 navigate 分支跳過 PatternLayoutScreen 直接進 ArTutorialScreen；fabricRequirements allowKnit: true（jersey-friendly）、patternAreasBySize 固定 600 cm² 確保 T-shirt 必過 feasibility。Edge cases：相機拒絕→ denied splash 兩鈕（回 templateSelect / 看純文字 stepGuide，靠 patterns/noSewTote.js fallback）；calibPxPerCm 為 null（手動路徑）→ fallback 5.6 px/cm + 黃色「⚠ Approx」chip；12 ticks 校準後超出畫面→紅色警告「Move phone back」。同步把 UploadScreen 的手動輸入 cm 還原回來，與 AR 測量並列為兩種選擇（手動路徑跳過 arMeasure 直接到 analysis、calibPxPerCm 留 null）。
