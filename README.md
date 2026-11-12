
# CampusFix — 校園問題通報與追蹤系統

CampusFix is a web-based campus issue reporting and tracking system developed for a Software Engineering course project.

CampusFix 是一套校園問題通報與追蹤系統，提供學生通報校園問題，以及工作人員管理、處理與結案的功能。

系統採用 Next.js、TypeScript、Tailwind CSS 與 Supabase 建構，並透過 GitHub 進行版本管理、Vercel 進行網站部署。

## Live Demo

**正式網站：**

https://campus-fix-team6-final.vercel.app

**GitHub Repository：**

https://github.com/bryanehuang/CampusFix-Team6

> 使用完整功能需要登入。Staff 工作人員權限必須由系統管理者事先設定，不會因為一般帳號註冊而自動取得。

---

## 1. Project Overview

### 1.1 Project Background

校園內經常出現設備損壞、環境維護或公共設施異常等問題。

傳統的通報方式可能存在以下限制：

- 學生不知道應該向哪個單位通報。
- 通報後難以確認案件是否已被處理。
- 缺乏統一的案件紀錄與追蹤機制。
- 工作人員不易集中管理待處理事項。

因此，本專題開發 CampusFix，提供一個集中式的校園問題通報平台。

### 1.2 Project Objectives

本系統的主要目標包括：

1. 提供學生簡單、快速的問題通報功能。
2. 建立校園問題的集中式紀錄。
3. 讓學生可以查詢案件處理進度。
4. 讓工作人員管理並更新案件狀態。
5. 記錄結案結果，提高處理過程的透明度。
6. 透過角色權限控制，區分學生與工作人員操作。

---

## 2. User Roles

CampusFix 主要分為兩種使用者角色。

### Student（學生）

學生可以：

- 註冊與登入帳號。
- 新增校園問題通報。
- 瀏覽通報列表。
- 查看通報詳細內容。
- 使用關鍵字搜尋通報。
- 依發生地點或處理狀態篩選案件。
- 查看已結案案件的處理結果。

### Staff（工作人員）

工作人員除了可以瀏覽通報內容，還可以：

- 進入工作人員管理後台。
- 查看所有通報案件。
- 查看待處理、處理中、已結案的案件數量。
- 將待處理案件更新為處理中。
- 填寫處理結果。
- 將處理中的案件完成結案。

一般 Student 不具有工作人員管理權限。

---

## 3. Core Features

本專題依照 Software Engineering 課程的需求，將主要功能規劃為 S1～S9，共 9 個 User Stories。

| Story | Feature | Description |
|---|---|---|
| S1 | Submit Issue | 學生新增校園問題通報 |
| S2 | View Issue List | 學生瀏覽問題通報列表 |
| S3 | View Issue Details | 查看通報詳細資訊與處理狀態 |
| S4 | Search Issues | 使用關鍵字搜尋案件 |
| S5 | Filter Issues | 依發生地點篩選通報 |
| S6 | Staff Dashboard | 工作人員查看及管理通報 |
| S7 | Start Processing | 將案件狀態更新為處理中 |
| S8 | Resolve Issue | 填寫結案說明並完成結案 |
| S9 | View Resolution | 學生查看已結案案件及處理結果 |

### Additional Features

除了 S1～S9 主要功能外，系統也包含：

- Email / Password 身分驗證。
- Student / Staff 角色辨識。
- Supabase Row Level Security（RLS）。
- 通報狀態管理。
- 表單輸入驗證。
- 操作成功與錯誤訊息。
- Responsive Web Design（響應式網頁設計）。
- GitHub 版本控制。
- Vercel 雲端部署。

---

## 4. Technology Stack

| Category | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Language | TypeScript |
| UI Framework | React |
| Styling | Tailwind CSS |
| Backend Services | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Supabase Row Level Security |
| Version Control | Git / GitHub |
| Deployment | Vercel |
| Project Management | Jira |

### Frontend

使用 Next.js App Router 建立網站頁面，並搭配 React 與 TypeScript 實作互動功能。

Tailwind CSS 用於管理網站樣式、版面配置及響應式設計。

### Backend

使用 Supabase 提供：

- PostgreSQL 資料庫。
- Email / Password Authentication。
- 使用者登入狀態管理。
- 資料庫存取及更新。
- Row Level Security 權限控制。

### Deployment

網站程式碼儲存在 GitHub Repository，並透過 Vercel 進行部署。

正式網站使用 Vercel Production Environment。

---

## 5. System Architecture

CampusFix 採用前後端整合的 Web Application 架構。

```text
                CampusFix Users
                       |
             +---------+---------+
             |                   |
           Student              Staff
             |                   |
             +---------+---------+
                       |
                       v
              Next.js Frontend
             React + TypeScript
                Tailwind CSS
                       |
                       v
                 Supabase Client
                       |
             +---------+---------+
             |                   |
             v                   v
       Supabase Auth      PostgreSQL Database
             |                   |
             v                   v
      Authentication       Row Level Security
                                 |
                        +--------+--------+
                        |                 |
                      reports        staff_members
```

### Architecture Description

1. 使用者透過瀏覽器存取 CampusFix。
2. Next.js 負責頁面呈現與前端互動。
3. Supabase Auth 負責帳號登入與身分驗證。
4. PostgreSQL 儲存通報資料與工作人員資料。
5. Row Level Security 控制不同角色的資料存取權限。
6. Vercel 提供正式網站的部署環境。

---

## 6. Issue Workflow

CampusFix 的案件處理流程分為三種狀態。

```text
        Student Submits Issue
                  |
                  v
             Submitted
              (待處理)
                  |
                  | Staff starts processing
                  v
             In Progress
              (處理中)
                  |
                  | Staff adds resolution
                  v
              Resolved
              (已結案)
                  |
                  v
        Student Views Result
```

### Status Definitions

| Status | 中文名稱 | Description |
|---|---|---|
| Submitted | 待處理 | 學生已提交通報，等待處理 |
| In Progress | 處理中 | 工作人員已開始處理案件 |
| Resolved | 已結案 | 工作人員完成處理並記錄結果 |

### Workflow Rules

系統使用資料庫限制與 Trigger 管理狀態轉換。

合法轉換為：

- `Submitted → In Progress`
- `In Progress → Resolved`

不允許：

- 跳過處理中直接結案。
- 從已結案返回處理中。
- 從處理中返回待處理。

完成結案時，必須輸入符合長度限制的處理結果。

目前結案說明限制為 10～2000 個字元。

---

## 7. Database Design

本專題使用 Supabase PostgreSQL。

### 7.1 reports

儲存校園問題通報資料。

| Column | Description |
|---|---|
| id | 通報唯一識別碼（UUID） |
| reporter_id | 通報學生的 User ID |
| title | 問題標題 |
| category | 問題分類 |
| location | 發生地點 |
| description | 問題詳細描述 |
| status | 案件處理狀態 |
| resolution | 工作人員結案說明 |
| created_at | 通報建立時間 |

### 7.2 staff_members

儲存具有工作人員權限的使用者。

| Column | Description |
|---|---|
| user_id | 工作人員的 User ID |

### Database Security

系統使用 Supabase Row Level Security（RLS），限制不同角色的資料操作權限。

主要設計原則：

- 使用者必須通過身分驗證才能執行受保護操作。
- 學生可以新增自己的問題通報。
- 一般學生不能透過工作人員介面更新案件狀態。
- 只有具有 Staff 權限的帳號才能執行案件處理與結案。
- 資料庫會檢查案件狀態轉換是否符合規則。

> 注意：RLS Policy、Trigger 與資料表 Schema 必須在 Supabase 資料庫中正確設定。單純複製前端專案不會自動建立所有資料庫規則。

---

## 8. Project Structure

主要專案結構如下：

```text
campusfix/
|
+-- app/
|   |
|   +-- page.tsx
|   +-- layout.tsx
|   +-- globals.css
|   +-- icon.svg
|   |
|   +-- login/
|   |   +-- page.tsx
|   |
|   +-- reports/
|   |   +-- page.tsx
|   |   |
|   |   +-- new/
|   |   |   +-- page.tsx
|   |   |
|   |   +-- [id]/
|   |       +-- page.tsx
|   |
|   +-- staff/
|       +-- page.tsx
|
+-- lib/
|   +-- supabase/
|       +-- client.ts
|
+-- public/
|
+-- package.json
+-- tsconfig.json
+-- README.md
```

### Main Routes

| Route | Description |
|---|---|
| `/` | 系統首頁 |
| `/login` | 使用者登入及註冊 |
| `/reports` | 校園通報列表 |
| `/reports/new` | 新增問題通報 |
| `/reports/[id]` | 通報詳細頁面 |
| `/staff` | 工作人員管理後台 |

---

## 9. Local Development

### Prerequisites

開始之前，請先安裝：

- Node.js
- npm
- Git

並準備一個已設定完成的 Supabase 專案。

### Step 1: Clone Repository

```bash
git clone https://github.com/bryanehuang/CampusFix-Team6.git
cd CampusFix-Team6
```

若 Repository 設定為 Private，必須具有 GitHub 存取權限才能 Clone。

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

在專案根目錄建立 `.env.local`。

範例：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_public_key
```

實際環境變數名稱必須與 `lib/supabase/client.ts` 一致。

若該檔案使用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，應改用相同名稱設定。

Supabase Project URL 與 Publishable / Anon Key 可以在 Supabase Dashboard 的 API 設定中取得。

**Security Notes:**

- 不要把 `.env.local` 提交到 GitHub。
- 不要在 `NEXT_PUBLIC_` 變數中放入 Service Role Key。
- 正式環境的變數需另外設定在 Vercel。
- 請勿將真實密碼或其他機密憑證寫入 README。

### Step 4: Run Development Server

```bash
npm run dev
```

開啟：

http://localhost:3000

如果 Windows PowerShell 因執行原則而無法執行 `npm.ps1`，可以改用：

```powershell
npm.cmd run dev
```

### Step 5: Production Build

```bash
npm run build
```

在 Windows PowerShell 也可以使用：

```powershell
npm.cmd run build
```

### Database Setup Requirement

本專案需要搭配已設定的 Supabase 資料庫，包括：

1. `reports` 資料表。
2. `staff_members` 資料表。
3. Supabase Authentication。
4. RLS Policies。
5. 案件狀態轉換的 Constraint 與 Trigger。

目前資料庫設定主要保存在 Supabase 專案中；若需從零重建環境，應另外匯出完整 SQL Schema 與 Policies。

---

## 10. Deployment

CampusFix 使用 Vercel 部署 Next.js 應用程式。

### Deployment Process

```text
Local Development
       |
       v
   Git Commit
       |
       v
   GitHub main
       |
       v
 Vercel Deployment
       |
       v
 Production Website
```

### Production URL

https://campus-fix-team6-final.vercel.app

### Environment Variables

Vercel Production Environment 必須設定與程式碼一致的：

- `NEXT_PUBLIC_SUPABASE_URL`
- Supabase Public / Publishable Key 對應的環境變數

環境變數修改後需要重新部署，新的設定才會套用至新的 Build。

---

## 11. Testing

本系統的測試重點包含：

### Functional Testing

- [ ] Student 可以成功註冊、登入及登出。
- [ ] Student 可以新增問題通報。
- [ ] 新增通報後可以在列表中查看。
- [ ] 可以查看通報詳細內容。
- [ ] 關鍵字搜尋功能正常。
- [ ] 發生地點篩選功能正常。
- [ ] 處理狀態篩選功能正常。
- [ ] Staff 可以登入管理後台。
- [ ] Staff 可以將案件更新為 In Progress。
- [ ] Staff 可以填寫結案說明。
- [ ] Staff 可以將案件更新為 Resolved。
- [ ] Student 可以查看已結案案件及處理結果。

### Authorization Testing

- [ ] 未登入使用者無法執行受保護的操作。
- [ ] Student 無法使用 Staff 管理功能。
- [ ] Student 無法透過資料庫 API 未經授權修改案件狀態。
- [ ] Staff 可以執行合法的案件狀態更新。
- [ ] 資料庫拒絕不合法的狀態轉換。

### Deployment Testing

- [ ] Vercel Production Build 成功。
- [ ] 正式網站可以正常載入。
- [ ] 正式環境可以連接 Supabase。
- [ ] 正式環境登入與登出正常。
- [ ] 正式環境的案件新增及結案流程正常。

> 上述清單用於記錄驗收結果。只有實際完成測試後才應勾選。

---

## 12. Project Management

本專題使用 Jira 進行 Agile Development（敏捷開發）管理。

### Development Method

採用以下軟體工程實務：

- Requirements Analysis
- User Stories
- Product Backlog
- Task Breakdown
- Incremental Development
- Version Control
- Functional Testing
- Deployment

### Jira Organization

專題功能以 Epic 與 User Story 管理。

主要工作項目分成：

1. Student Issue Reporting
2. Student Issue Viewing and Searching
3. Staff Issue Management

各項需求對應 S1～S9，方便追蹤功能開發與驗收進度。

---

## 13. Current Project Status

### Implemented

- Next.js 前端架構
- Supabase 資料庫連接
- 使用者登入及角色辨識
- S1～S9 核心功能
- 工作人員管理後台
- 案件處理與結案流程
- GitHub 版本管理
- Vercel 正式部署
- CampusFix 網站標題與圖示

### In Progress

- 正式環境完整功能驗收
- UI / UX 細節改善
- Responsive Design 檢查
- 測試紀錄整理
- Jira 專題文件整理

### Potential Future Improvements

以下為未來可擴充功能，目前不屬於已完成的 S1～S9 範圍。

- 上傳通報照片
- Email 通知
- 案件優先程度設定
- 分頁與大量資料管理
- 工作人員操作紀錄
- 更完整的統計分析 Dashboard
- 自動化測試

---

## 14. Academic Project

**Project:** CampusFix

**Course:** Software Engineering

**Team:** Team 6

**Development Period:** November 2026

本專題以軟體工程課程所學的需求分析、敏捷開發、系統設計、版本管理與軟體測試等概念為基礎，實作一套可部署並操作的 Web Application。

---

## 15. Project Summary

CampusFix 整合學生通報、案件查詢及工作人員管理功能，提供完整的校園問題處理流程。

本專題除了完成基本 Web Application 功能，也實作使用者身分驗證、角色權限管理、資料庫狀態控制，以及雲端部署。

透過 Jira 與 GitHub 管理開發過程，使系統開發流程更符合 Software Engineering 的專題實務。
