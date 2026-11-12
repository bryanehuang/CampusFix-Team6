
"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ==========================================
// Supabase Client
// ==========================================

const supabase = createClient();

// ==========================================
// Type Definitions
// ==========================================

type AuthMode = "login" | "register";

type Feedback = {
  type: "success" | "error";
  text: string;
};

// ==========================================
// 處理 Supabase 錯誤訊息
// ==========================================

function formatAuthError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "電子郵件或密碼不正確，請重新確認。";
  }

  if (message.includes("email not confirmed")) {
    return "電子郵件尚未驗證，請先至信箱完成帳號驗證。";
  }

  if (message.includes("user already registered")) {
    return "此電子郵件已經註冊，請直接登入。";
  }

  if (message.includes("password")) {
    return `密碼驗證失敗：${error.message}`;
  }

  if (message.includes("rate limit")) {
    return "操作過於頻繁，請稍後再試。";
  }

  return `操作失敗：${error.message}`;
}

// ==========================================
// CampusFix Login Page
// ==========================================

export default function LoginPage() {
  const router = useRouter();

  // 預設為登入模式
  const [mode, setMode] = useState<AuthMode>("login");

  // 表單資料
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  // 操作狀態
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const isRegister = mode === "register";

  // ==========================================
  // 切換登入 / 註冊
  // ==========================================

  function switchMode(nextMode: AuthMode) {
    if (loading) return;

    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setFeedback(null);
  }

  // ==========================================
  // 登入 / 註冊提交
  // ==========================================

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setFeedback(null);

    const cleanEmail = email.trim();

    // ======================================
    // Step 1：基本欄位檢查
    // ======================================

    if (!cleanEmail || !password) {
      setFeedback({
        type: "error",
        text: "請輸入電子郵件與密碼。",
      });
      return;
    }

    // 註冊時額外檢查密碼
    if (isRegister) {
      if (password.length < 8) {
        setFeedback({
          type: "error",
          text: "註冊密碼至少需要 8 個字元。",
        });
        return;
      }

      if (password !== confirmPassword) {
        setFeedback({
          type: "error",
          text: "兩次輸入的密碼不一致。",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // ====================================
      // Step 2A：使用者註冊
      // ====================================

      if (isRegister) {
        const {
          data,
          error: registerError,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (registerError) {
          throw registerError;
        }

        // 若 Supabase 不要求 Email 驗證
        // 註冊後可能直接取得 Session
        if (data.session) {
          setPassword("");
          setConfirmPassword("");

          router.replace("/");
          return;
        }

        // 需要 Email 驗證
        // 切換回登入畫面
        setMode("login");
        setPassword("");
        setConfirmPassword("");

        setFeedback({
          type: "success",
          text:
            "註冊請求已送出！如果需要驗證電子郵件，請前往信箱點擊驗證連結，完成後再登入。",
        });

        return;
      }

      // ====================================
      // Step 2B：使用者登入
      // ====================================

      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      // ====================================
      // Step 3：確認登入 Session
      // ====================================

      if (!data.session || !data.user) {
        throw new Error(
          "登入尚未建立有效 Session，請重新嘗試。"
        );
      }

      // ====================================
      // Step 4：登入成功，自動返回首頁
      // ====================================

      setPassword("");
      setConfirmPassword("");

      router.replace("/");

    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? formatAuthError(error)
            : "系統發生錯誤，請稍後再試。",
      });

    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // 共用輸入欄位樣式
  // ==========================================

  const inputStyle =
    "w-full rounded-lg border border-slate-300 " +
    "bg-white px-4 py-3 text-slate-800 " +
    "placeholder:text-slate-400 " +
    "focus:border-blue-500 focus:outline-none " +
    "focus:ring-2 focus:ring-blue-100 " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  const labelStyle =
    "mb-2 block text-sm font-medium text-slate-700";

  // ==========================================
  // Login / Register UI
  // ==========================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-800">

      <div className="w-full max-w-md">

        {/* 返回首頁 */}
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          ← 返回首頁
        </Link>

        {/* 登入卡片 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* CampusFix 標題 */}
          <div className="text-center">

            <h1 className="text-3xl font-bold text-blue-700">
              CampusFix
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              校園問題通報系統
            </p>

          </div>

          {/* 登入 / 註冊標題 */}
          <div className="mt-9">

            <h2 className="text-2xl font-bold">
              {isRegister
                ? "建立新帳號"
                : "使用者登入"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {isRegister
                ? "填寫以下資訊，建立 CampusFix 帳號。"
                : "請輸入電子郵件及密碼，登入 CampusFix。"}
            </p>

          </div>

          {/* =================================
              登入 / 註冊表單
             ================================= */}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-5"
          >

            {/* 電子郵件 */}
            <div>
              <label
                htmlFor="email"
                className={labelStyle}
              >
                電子郵件
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@email.com"
                className={inputStyle}
                required
                disabled={loading}
              />
            </div>

            {/* 密碼 */}
            <div>
              <label
                htmlFor="password"
                className={labelStyle}
              >
                密碼
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  isRegister
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder={
                  isRegister
                    ? "請設定至少 8 個字元的密碼"
                    : "請輸入密碼"
                }
                className={inputStyle}
                required
                minLength={isRegister ? 8 : undefined}
                disabled={loading}
              />
            </div>

            {/* 確認密碼：僅註冊模式顯示 */}
            {isRegister && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className={labelStyle}
                >
                  確認密碼
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="請再次輸入密碼"
                  className={inputStyle}
                  minLength={8}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* 登入 / 註冊按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? isRegister
                  ? "正在建立帳號..."
                  : "正在驗證帳號..."
                : isRegister
                  ? "註冊帳號"
                  : "登入"}
            </button>

          </form>

          {/* =================================
              成功或失敗訊息
             ================================= */}

          {feedback && (
            <div
              role={
                feedback.type === "error"
                  ? "alert"
                  : "status"
              }
              className={
                feedback.type === "success"
                  ? "mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
                  : "mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
              }
            >
              {feedback.text}
            </div>
          )}

          {/* =================================
              登入 / 註冊切換
             ================================= */}

          <div className="mt-8 border-t border-slate-100 pt-6 text-center">

            {isRegister ? (
              <p className="text-sm text-slate-600">
                已經有帳號了？
                {" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  disabled={loading}
                  className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                >
                  返回登入
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                還沒有帳號？
                {" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  disabled={loading}
                  className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                >
                  立即註冊
                </button>
              </p>
            )}

          </div>

        </div>

        {/* 頁尾 */}
        <p className="mt-7 text-center text-sm text-slate-400">
          CampusFix © 2026 | Software Engineering Project
        </p>

      </div>
    </main>
  );
}
