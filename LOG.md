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
