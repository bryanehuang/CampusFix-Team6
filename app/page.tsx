
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ==========================================
// CampusFix - Supabase Client
// ==========================================

const supabase = createClient();

// ==========================================
// 使用者角色定義
// ==========================================

type UserRole = "student" | "staff";

type AccountState =
  | { status: "loading" }
  | { status: "guest" }
  | {
      status: "authenticated";
      email: string;
      role: UserRole;
    }
  | {
      status: "error";
      message: string;
    };

// ==========================================
// 系統功能資料
// ==========================================

const features = [
  {
    id: "S1",
    title: "新增問題通報",
    description:
      "填寫問題標題、分類、發生地點與詳細描述，提交校園問題。",
    icon: "📝",
    href: "/reports/new",
    action: "開始通報",
    staffOnly: false,
  },
  {
    id: "S2-S3",
    title: "瀏覽通報紀錄",
    description:
      "瀏覽校園問題通報列表，查看詳細內容與目前處理狀態。",
    icon: "📋",
    href: "/reports",
    action: "瀏覽通報",
    staffOnly: false,
  },
  {
    id: "S4-S5",
    title: "搜尋與篩選",
    description:
      "透過問題標題關鍵字或發生地點，快速搜尋相關通報。",
    icon: "🔍",
    href: "/reports",
    action: "搜尋問題",
    staffOnly: false,
  },
  {
    id: "S6-S8",
    title: "工作人員管理",
    description:
      "工作人員可檢視通報、開始處理問題並填寫結案結果。",
    icon: "🛠️",
    href: "/staff",
    action: "進入管理系統",
    staffOnly: true,
  },
  {
    id: "S9",
    title: "查看處理結果",
    description:
      "瀏覽已結案通報，查看工作人員填寫的處理結果。",
    icon: "✅",
    href: "/reports?status=Resolved",
    action: "查看結案結果",
    staffOnly: false,
  },
];

// ==========================================
// CampusFix 首頁
// ==========================================

export default function Home() {
  // 使用者身分
  const [account, setAccount] = useState<AccountState>({
    status: "loading",
  });

  // 登出狀態
  const [loggingOut, setLoggingOut] = useState(false);

  // 錯誤訊息
  const [authMessage, setAuthMessage] = useState("");

  // 重新驗證身分
  const [authVersion, setAuthVersion] = useState(0);

  // ==========================================
  // 1. 監聽 Supabase 登入狀態
  // ==========================================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAccount({ status: "guest" });
        setAuthMessage("");

        setAuthVersion((value) => value + 1);
      }

      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        setAuthVersion((value) => value + 1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // 2. 確認 Session 和使用者角色
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      setAccount({ status: "loading" });

      try {
        // Step A：確認 Session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (sessionError) {
          if (
            sessionError.name ===
            "AuthSessionMissingError"
          ) {
            setAccount({ status: "guest" });
            return;
          }

          throw new Error(sessionError.message);
        }

        // 尚未登入
        if (!session) {
          setAccount({ status: "guest" });
          return;
        }

        // Step B：驗證使用者
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (userError) {
          if (
            userError.name ===
              "AuthSessionMissingError" ||
            userError.message
              .toLowerCase()
              .includes("auth session missing")
          ) {
            setAccount({ status: "guest" });
            return;
          }

          throw new Error(userError.message);
        }

        if (!user) {
          setAccount({ status: "guest" });
          return;
        }

        // Step C：從 staff_members 查詢身分
        const {
          data: staff,
          error: staffError,
        } = await supabase
          .from("staff_members")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (staffError) {
          throw new Error(
            "無法確認使用者角色：" +
              staffError.message
          );
        }

        // Step D：決定角色
        const role: UserRole = staff
          ? "staff"
          : "student";

        setAccount({
          status: "authenticated",
          email: user.email ?? "已登入使用者",
          role,
        });

      } catch (error) {
        if (!active) return;

        setAccount({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "無法確認帳號狀態",
        });
      }
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, [authVersion]);

  // ==========================================
  // 3. 登出功能
  // ==========================================

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // 登出後顯示訪客模式
      setAccount({ status: "guest" });

    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? `登出失敗：${error.message}`
          : "登出失敗，請稍後重試。"
      );

    } finally {
      setLoggingOut(false);
    }
  }

  // ==========================================
  // 4. 角色判斷與功能過濾
  // ==========================================

  const isStaff =
    account.status === "authenticated" &&
    account.role === "staff";

  // 只有 Staff 才能看到工作人員管理
  const visibleFeatures = features.filter((feature) => {
    if (feature.staffOnly) {
      return isStaff;
    }

    return true;
  });

  // ==========================================
  // 5. 首頁畫面
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">

      {/* =====================================
          Header：頂部導覽列
         ===================================== */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          {/* CampusFix Logo */}
          <Link href="/" className="block">

            <h1 className="text-2xl font-bold text-blue-700">
              CampusFix
            </h1>

            <p className="text-xs text-slate-500">
              校園問題通報系統
            </p>

          </Link>

          {/* 右上角導覽 */}
          <nav className="flex flex-wrap items-center gap-3">

            <Link
              href="/reports"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
            >
              通報列表
            </Link>

            <Link
              href="/reports/new"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
            >
              新增通報
            </Link>

            {/* 只有工作人員顯示管理後台 */}
            {isStaff && (
              <Link
                href="/staff"
                className="rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                管理後台
              </Link>
            )}

            <div className="hidden h-7 w-px bg-slate-200 sm:block" />

            {/* 載入中 */}
            {account.status === "loading" && (
              <span className="text-sm text-slate-400">
                正在確認身分...
              </span>
            )}

            {/* 訪客 */}
            {account.status === "guest" && (
              <Link
                href="/login"
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                登入／註冊
              </Link>
            )}

            {/* 已登入帳號 */}
            {account.status === "authenticated" && (
              <>

                {/* 使用者角色 */}
                <span
                  className={
                    account.role === "staff"
                      ? "rounded-full bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700"
                      : "rounded-full bg-green-100 px-3 py-2 text-xs font-semibold text-green-700"
                  }
                >
                  {account.role === "staff"
                    ? "工作人員"
                    : "學生"}
                </span>

                {/* Email */}
                <span
                  className="hidden max-w-48 truncate text-sm text-slate-600 md:inline"
                  title={account.email}
                >
                  {account.email}
                </span>

                {/* 登出 */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {loggingOut
                    ? "登出中..."
                    : "登出"}
                </button>

              </>
            )}

            {/* 身分確認錯誤 */}
            {account.status === "error" && (
              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  title={account.message}
                  onClick={() =>
                    setAuthVersion((value) => value + 1)
                  }
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  身分確認失敗，重試
                </button>

                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  登入／註冊
                </Link>

              </div>
            )}

          </nav>
        </div>
      </header>

      {/* 登出錯誤訊息 */}
      {authMessage && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-6xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {authMessage}
        </div>
      )}

      {/* =====================================
          Hero：首頁介紹
         ===================================== */}

      <section className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-20 text-center text-white">

        <div className="mx-auto max-w-4xl">

          <span className="mb-6 inline-block rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm">
            Campus Issue Reporting System
          </span>

          <h2 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">
            讓校園問題，更快被解決
          </h2>

          <p className="mx-auto max-w-2xl text-lg leading-8 text-blue-100">
            發現校園設施損壞或環境問題？
            <br />
            透過 CampusFix 提交問題通報，
            <br />
            隨時掌握問題的最新處理進度。
          </p>

          {/* 主要操作 */}
          <div className="mt-9 flex flex-wrap justify-center gap-4">

            <Link
              href="/reports/new"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              立即通報
            </Link>

            <Link
              href="/reports"
              className="rounded-lg border border-white/60 px-8 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              查看通報
            </Link>

          </div>
        </div>
      </section>

      {/* =====================================
          系統功能
         ===================================== */}

      <section
        id="features"
        className="mx-auto max-w-6xl px-6 py-16"
      >

        <div className="mb-10 text-center">

          <h2 className="text-3xl font-bold">
            系統功能
          </h2>

          <p className="mt-3 text-slate-500">
            選擇下方功能，直接進入對應的 CampusFix 頁面
          </p>

        </div>

        {/* =====================================
            動態顯示功能卡片
            Student：4 張
            Staff：5 張
           ===================================== */}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {visibleFeatures.map((feature) => (

            <Link
              key={feature.id}
              href={feature.href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >

              {/* 圖示 */}
              <div className="mb-5 text-4xl">
                {feature.icon}
              </div>

              {/* 標題與 Story 編號 */}
              <div className="mb-3 flex items-start justify-between gap-3">

                <h3 className="text-xl font-semibold transition group-hover:text-blue-700">
                  {feature.title}
                </h3>

                <span className="shrink-0 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                  {feature.id}
                </span>

              </div>

              {/* 功能描述 */}
              <p className="text-sm leading-7 text-slate-500">
                {feature.description}
              </p>

              {/* 功能連結 */}
              <div className="mt-auto pt-6">

                <div className="border-t border-slate-100 pt-4">

                  <span className="text-sm font-semibold text-blue-700 transition group-hover:text-blue-900">
                    {feature.action} →
                  </span>

                </div>

              </div>

            </Link>

          ))}

        </div>
      </section>

      {/* =====================================
          Footer
         ===================================== */}

      <footer className="border-t border-slate-200 bg-white py-8 text-center">

        <p className="text-sm text-slate-500">
          CampusFix © 2026 | Software Engineering Project
        </p>

        <p className="mt-2 text-xs text-slate-400">
          CampusFix Team 6
        </p>

      </footer>

    </main>
  );
}
