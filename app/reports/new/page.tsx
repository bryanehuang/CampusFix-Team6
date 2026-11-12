
"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Supabase Client
const supabase = createClient();

// 問題分類
const categories = [
  "設施損壞",
  "環境清潔",
  "安全問題",
  "其他",
];

// 校園地點
const locations = [
  "教學大樓",
  "圖書館",
  "學生宿舍",
  "運動場",
  "其他地點",
];

// 訊息型別
type Feedback = {
  type: "success" | "error";
  text: string;
};

export default function NewReportPage() {
  // 表單資料
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // 提交狀態
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // S1-T3：提交校園問題至 Supabase
  // ==========================================
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setFeedback(null);

    // 1. 驗證輸入內容
    if (
      title.trim().length < 5 ||
      title.trim().length > 100
    ) {
      setFeedback({
        type: "error",
        text: "問題標題需要 5～100 個字。",
      });
      return;
    }

    if (!category || !location) {
      setFeedback({
        type: "error",
        text: "請選擇問題分類和發生地點。",
      });
      return;
    }

    if (
      description.trim().length < 10 ||
      description.trim().length > 2000
    ) {
      setFeedback({
        type: "error",
        text: "詳細描述需要 10～2000 個字。",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. 取得目前登入的使用者
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setFeedback({
          type: "error",
          text: "尚未登入，請先前往登入頁面。",
        });
        return;
      }

      // 3. 將通報資料寫入 PostgreSQL
      const { error: insertError } = await supabase
        .from("reports")
        .insert({
          reporter_id: user.id,
          title: title.trim(),
          category: category,
          location: location,
          description: description.trim(),
        });

      // 4. 處理資料庫錯誤
      if (insertError) {
        setFeedback({
          type: "error",
          text: `提交失敗：${insertError.message}`,
        });
        return;
      }

      // 5. 提交成功
      setFeedback({
        type: "success",
        text: "通報提交成功！資料已儲存至 Supabase 資料庫。",
      });

      // 6. 清空表單
      setTitle("");
      setCategory("");
      setLocation("");
      setDescription("");

    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? `連線失敗：${error.message}`
            : "無法連接資料庫，請稍後重試。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ==========================================
  // 表單樣式
  // ==========================================
  const inputStyle =
    "w-full rounded-lg border border-slate-300 " +
    "bg-white px-4 py-3 text-slate-800 " +
    "focus:border-blue-500 focus:outline-none " +
    "focus:ring-2 focus:ring-blue-100";

  const labelStyle =
    "mb-2 block font-medium text-slate-700";

  // ==========================================
  // S1-T1：學生通報表單介面
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <div className="mx-auto max-w-2xl">

        {/* 返回首頁 */}
        <Link
          href="/"
          className="text-blue-700 hover:underline"
        >
          ← 返回首頁
        </Link>

        {/* 頁面標題 */}
        <h1 className="mt-8 text-3xl font-bold">
          新增校園問題通報
        </h1>

        <p className="mt-3 text-slate-500">
          請填寫以下資訊，讓工作人員了解校園問題。
        </p>

        {/* 通報表單 */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
        >

          {/* 問題標題 */}
          <div>
            <label
              htmlFor="title"
              className={labelStyle}
            >
              問題標題 *
            </label>

            <input
              id="title"
              type="text"
              className={inputStyle}
              placeholder="例如：圖書館三樓冷氣故障"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          {/* 問題分類 */}
          <div>
            <label
              htmlFor="category"
              className={labelStyle}
            >
              問題分類 *
            </label>

            <select
              id="category"
              className={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">
                請選擇分類
              </option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* 發生地點 */}
          <div>
            <label
              htmlFor="location"
              className={labelStyle}
            >
              發生地點 *
            </label>

            <select
              id="location"
              className={inputStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">
                請選擇地點
              </option>

              {locations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* 詳細描述 */}
          <div>
            <label
              htmlFor="description"
              className={labelStyle}
            >
              詳細描述 *
            </label>

            <textarea
              id="description"
              className={inputStyle}
              rows={5}
              placeholder="請描述問題發生的情況、位置和影響..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              disabled={isSubmitting}
            />
          </div>

          {/* 提交按鈕 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "正在提交..."
              : "提交問題通報"}
          </button>

          {/* 成功或錯誤訊息 */}
          {feedback && (
            <div
              role="status"
              aria-live="polite"
              className={
                feedback.type === "success"
                  ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                  : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              }
            >
              {feedback.text}

              {feedback.type === "error" &&
                feedback.text.includes("尚未登入") && (
                  <div className="mt-2">
                    <Link
                      href="/login"
                      className="font-semibold underline"
                    >
                      前往登入頁面
                    </Link>
                  </div>
                )}
            </div>
          )}

        </form>

        {/* 下方說明 */}
        <p className="mt-6 text-center text-sm text-slate-500">
          CampusFix 校園問題通報系統
        </p>

      </div>
    </main>
  );
}
