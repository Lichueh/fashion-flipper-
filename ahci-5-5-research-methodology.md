# AHCI 5/5 作業：研究方法 + 關鍵設計決策

> 對應 `[2026S AHCI] 5_5 Research Methodology.pptx` 的兩項 Deliverables：
> 1. 三階段（Understand / Design / Evaluate）研究設計
> 2. 3–5 個關鍵設計問題（含證據層級）

---

## 一、Study Summary Table

| 階段 | 研究 | 目標 | 方法 | 設計類型 | 主要任務 | 主要指標 | 分析方法 | 受試者 | 參考文獻 |
|---|---|---|---|---|---|---|---|---|---|
| **理解問題** | Formative #1：Pile-of-Guilt（已做 4 人，再補 4–6 人） | 驗證 bottleneck 在 fabric→project 決策，不在縫紉技術 | 半結構訪談 + 物件導引 | 質性 | 受訪者帶 idle thrifted item 講解卡關 | 阻礙主題編碼 | Reflexive thematic analysis | 8–10 位 beginner-intermediate sewer，從 sewing community 招募 | Sung et al.（PMC） |
| | Formative #2：專家知識萃取 | 取得 fabric→use case 的隱性知識 | Think-aloud + 現場示範 | 質性 | 裁縫師判讀 idle item | 知識編碼 mapping | Reflexive thematic analysis | 4–6 位裁縫師（XIJIA 講師） | Cheatle & Jackson（CSCW 2023） |
| **指引設計** | Design Iter #1：可用性測試（已完成 ✅） | 抓 fabric analysis、template、layout 的可用性問題 | Task-based usability + Likert | 質性 + 偏好量表 | 6 個任務 | 完成度、struggle 點、Likert | Constant comparison | 5 人（3 beginner + 1 inter + 1 advanced）✅ | MR.Drum（CHI 2025）UI iteration |
| | **Design Iter #2：Gen-AI 品質評估 vs Pinterest/YouTube** | 驗證 Nano Banana 產出（line drawing + fabric swatch）相對 Pinterest/YouTube 的品質 | A/B/C 三組比較 + 訪談 | Within-subjects | 看 8–10 件 thrifted item，每件比較三組視覺：(A) Pinterest 搜尋結果 (B) YouTube thumbnail (C) Fashion Flipper Nano Banana preview | 真實感、信任度、helpfulness、specificity（7-pt Likert）+ 質性訪談 | Friedman test + reflexive thematic | 8 人 | **RoomDreaming**（CHI 2025）⭐ 結構直接對應 |
| | Design Iter #3：強化版原型 pilot | 驗證 fabric algorithm + instruction 拆解 + Nano Banana 整合的綜合改善 | Pilot + 訪談 | Iterative | 兩個改造任務 | SUS、版本間偏好 | 質性 + SUS | 4–6 人 | MR.Drum iterative testing |
| | Design Iter #4：AHCI 課程驗收 pilot | end-to-end 可用性 + 三語切換 | 完整系統 pilot | 質性 + SUS | 完整流程：Home→Upload→Analysis→Template→AR→Step Guide | SUS、bug 清單、語言切換清晰度 | 質性 + SUS | **4–8 pilot users**（AHCI 規定） | MR.Drum |
| **評估解法** | Summative UX Study | 驗證 Fashion Flipper 對 beginner 的決策支援，相對 Pinterest+YouTube 工作流（current workaround） | Comparative study | **Within-subjects, counter-balanced** | 兩段 25–30 min decision 任務，每段給一件 thrifted item：<br>(A) 用 Pinterest+YouTube 規劃改造（baseline）<br>(B) 用 Fashion Flipper | **客觀**：決策耗時、是否 abandon、follow-up 嘗試率<br>**主觀**：Creativity Support Index、commitment Likert、信心、NASA-TLX | Wilcoxon Signed Rank + 質性 constant comparison | **16–18 人**（CHI 投稿目標），sewing community | MR.Drum（CHI 2025）⭐ within-subjects vs baseline |

---

## 二、5 個關鍵設計問題

依照 AHCI 5/5 投影片 Slide 8 的證據層級：**設計原則可決定 / pilot 處理 / controlled study**。

| # | 關鍵設計問題 | 證據層級 | 對應的 study |
|---|---|---|---|
| 1 | **Inspiration photo / 文字輸入**：要讓使用者主動輸入想做什麼，還是 AI 直接推薦？ | Pilot（n=4–6） | 補做 small pilot |
| 2 | **Pattern Layout Screen 對 beginner 的呈現**：要不要 intro/explainer + 真實衣物背景圖？ | Pilot（n=6–8） | Design Iter #3 |
| 3 | **Feasibility Calculator 視覺化**：可用布料面積要怎麼呈現才能讓使用者一眼看懂、產生信心？ | Pilot（n=6–8） | Design Iter #3 |
| 4 | **Nano Banana preview 品質**：是否優於 Pinterest/YouTube 既有圖片？ | **Controlled study（n=8）** | **Design Iter #2** |
| 5 | **整體系統價值**：Fashion Flipper 是否提升 beginner 的 decision-making feasibility 與 commitment，相對 Pinterest+YouTube 工作流？ | **Controlled study（n=16–18）** | **Summative** |

> **背景說明**：fabric analyzer 的 confidence rating + manual override 已在 Design Iter #1 透過 pilot 解決（Slide 11 usability test）。屬於已驗證的設計決策，不列入待答問題。

---

## 三、參考文獻清單

> ACM DL 連結待補。下表是已經確認可以對應的 reference paper。

| 對應 study | 文獻 | 角色 |
|---|---|---|
| Formative #1 | Sung et al., *Extending Clothing Lifetime Through Repair and Reuse*（PMC） | Diagnose 同樣的 knowledge gap，Fashion Flipper 是這篇 gap 的直接回應 |
| Formative #2 | Cheatle & Jackson, *(Re)collecting Craft*（CSCW 2023） | Material literacy 框架 |
| Design Iter #1, #3, #4 | MR.Drum（CHI 2025） | UI iteration 流程模板 |
| Design Iter #2 ⭐ | RoomDreaming（CHI 2025） | Gen-AI Quality Evaluation 結構直接對應 |
| Summative ⭐ | MR.Drum（CHI 2025） | Within-subjects vs. instructional video baseline 結構 |
| Summative（補強） | Ji, Hu & EL-Zanfaly, *Wheel-Throwing AI-Augmented MR*（DIS 2025） | AI 輔助新手 craft 的 closest HCI precedent |
| Summative metric | Cherry & Latulipe, *Creativity Support Index*（ACM TOCHI 2014） | CSI 量表來源 |

---

## 四、待辦清單

- [ ] 與 Siri 對齊分工（Understand / Design / Evaluate phase 各誰負責）
- [ ] 抓 7 篇 reference 的 ACM DL 連結填回上表
- [ ] Design Iter #2 的 Pinterest/YouTube 比較細節：要評的 4 個 Likert dimension 確認、招募條件確認
- [ ] Summative baseline 細節：Pinterest+YouTube 工作流要不要限時、是否允許 Google search、是否事先 demo Fashion Flipper
- [ ] **Background motivation analysis**（4/15 老師建議）：YouTube/TikTok upcycling 影片 thumbnail "before/after" vs "process-only" 的 view count 比較，作為 paper 的 motivation figure（不是 user study，放 Introduction）

---

## 五、與既有文件的關係

- `docs/proposal-v2.md`：3/31 Team Project Proposal 內容
- `docs/related-work-draft.md`：相關工作整理
- `docs/study-design-v2.md`：先前對 comparative study 的細部重新設計（聚焦 RQ 與 condition 定義）
- 本文件：AHCI 5/5 作業整體交付，總結三階段方法 + 5 個關鍵設計問題
