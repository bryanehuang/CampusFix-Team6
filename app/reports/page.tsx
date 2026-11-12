
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// 地點選項
const locations = [
  "教學大樓",
  "圖書館",
  "學生宿舍",
  "運動場",
  "其他地點",
];

// 狀態選項
const statusOptions = [
  { value: "All", label: "所有狀態" },
  { value: "Submitted", label: "待處理" },
  { value: "In Progress", label: "處理中" },
  { value: "Resolved", label: "已結案" },
];

type StatusFilter =
  | "All"
  | "Submitted"
  | "In Progress"
  | "Resolved";

type Report = {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
};

// 避免搜尋特殊符號被解讀為萬用字元
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function getStatusInfo(status: string) {
  switch (status) {
    case "Submitted":
      return {
        label: "待處理",
        color: "bg-yellow-100 text-yellow-800",
      };
    case "In Progress":
      return {
        label: "處理中",
        color: "bg-blue-100 text-blue-800",
      };
    case "Resolved":
      return {
        label: "已結案",
        color: "bg-green-100 text-green-800",
      };
    default:
      return {
        label: status,
        color: "bg-slate-100 text-slate-700",
      };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ==========================================
// S2、S4、S5、S9：通報查詢
// ==========================================

function ReportsContent() {
  const searchParams = useSearchParams();

  // 從網址取得搜尋條件
  const keyword = (searchParams.get("q") ?? "")
    .trim()
    .slice(0, 100);

  const rawLocation = searchParams.get("location") ?? "";

  const location = locations.includes(rawLocation)
    ? rawLocation
    : "";

  const rawStatus = searchParams.get("status") ?? "All";

  const status: StatusFilter =
    rawStatus === "Submitted" ||
    rawStatus === "In Progress" ||
    rawStatus === "Resolved"
      ? rawStatus
      : "All";

  const isResolvedView = status === "Resolved";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // 從 Supabase 讀取通報
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadReports() {
      setLoading(true);
      setError("");
      setLoginRequired(false);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setLoginRequired(true);
          setReports([]);
          return;
        }

        let query = supabase
          .from("reports")
          .select(
            "id,title,category,location,status,created_at"
          );

        // S4：標題關鍵字搜尋
        if (keyword) {
          query = query.ilike(
            "title",
            `%${escapeLike(keyword)}%`
          );
        }

        // S5：地點篩選
        if (location) {
          query = query.eq("location", location);
        }

        // S9：處理狀態篩選
        if (status !== "All") {
          query = query.eq("status", status);
        }

        const { data, error: queryError } = await query
          .order("created_at", { ascending: false })
          .limit(50);

        if (!active) return;

        if (queryError) {
          throw new Error(queryError.message);
        }

        setReports((data ?? []) as Report[]);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "資料庫查詢失敗"
        );
        setReports([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, [keyword, location, status, refreshKey]);

  // ==========================================
  // 網頁顯示
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-700"
          >
            CampusFix
          </Link>

          <Link
            href="/reports/new"
            className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + 新增問題通報
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href="/"
          className="text-sm text-blue-700 hover:underline"
        >
          ← 返回首頁
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {isResolvedView
                ? "已結案通報與處理結果"
                : "校園問題通報列表"}
            </h1>

            <p className="mt-3 text-slate-500">
              {isResolvedView
                ? "查看已完成處理的校園問題及結案紀錄"
                : "搜尋、篩選並追蹤校園問題"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((x) => x + 1)}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            重新整理
          </button>
        </div>

        {/* 搜尋區域 */}
        <form
          key={searchParams.toString()}
          action="/reports"
          method="get"
          className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-lg font-semibold">
            搜尋與篩選通報
          </h2>

          <div className="grid gap-4 md:grid-cols-3">

            <div>
              <label
                htmlFor="keyword"
                className="mb-2 block text-sm font-medium"
              >
                標題關鍵字
              </label>
              <input
                id="keyword"
                name="q"
                type="search"
                defaultValue={keyword}
                maxLength={100}
                placeholder="例如：冷氣"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-sm font-medium"
              >
                發生地點
              </label>

              <select
                id="location"
                name="location"
                defaultValue={location}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
              >
                <option value="">所有地點</option>
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium"
              >
                處理狀態
              </label>

              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
              >
                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800"
            >
              搜尋通報
            </button>

            <Link
              href="/reports"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 hover:bg-slate-100"
            >
              清除篩選
            </Link>

            <Link
              href="/reports?status=Resolved"
              className="rounded-lg border border-green-200 bg-green-50 px-6 py-3 font-medium text-green-700 hover:bg-green-100"
            >
              只看已結案
            </Link>
          </div>
        </form>

        {/* 載入中 */}
        {loading && (
          <div className="mt-8 rounded-xl bg-white p-10 text-center text-slate-500">
            正在查詢通報資料...
          </div>
        )}

        {/* 未登入 */}
        {!loading && loginRequired && (
          <div className="mt-8 rounded-xl border bg-white p-10 text-center">
            <h2 className="text-xl font-bold">
              請先登入 CampusFix
            </h2>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-6 py-3 text-white"
            >
              前往登入
            </Link>
          </div>
        )}

        {/* 錯誤訊息 */}
        {!loading && error && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            {error}
          </div>
        )}

        {/* 查詢結果 */}
        {!loading && !loginRequired && !error && (
          <>
            <p className="my-6 text-sm text-slate-500">
              查詢結果：{reports.length} 筆
              （最多顯示最新 50 筆）
            </p>

            {reports.length === 0 && (
              <div className="rounded-xl border bg-white p-10 text-center">
                <h2 className="text-lg font-semibold">
                  {isResolvedView
                    ? "目前沒有符合條件的已結案通報"
                    : "找不到符合條件的通報"}
                </h2>

                <p className="mt-3 text-sm text-slate-500">
                  可以修改搜尋條件或查看全部通報。
                </p>

                <Link
                  href="/reports"
                  className="mt-5 inline-block text-blue-700 underline"
                >
                  查看全部通報
                </Link>
              </div>
            )}

            <div className="space-y-4">
              {reports.map((report) => {
                const info = getStatusInfo(report.status);

                return (
                  <article
                    key={report.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/reports/${report.id}`}
                          className="text-xl font-semibold hover:text-blue-700 hover:underline"
                        >
                          {report.title}
                        </Link>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                          <span>
                            分類：{report.category}
                          </span>
                          <span>
                            地點：{report.location}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-400">
                          通報時間：
                          {formatDate(report.created_at)}
                        </p>

                        <Link
                          href={`/reports/${report.id}`}
                          className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline"
                        >
                          {report.status === "Resolved"
                            ? "查看結案結果 →"
                            : "查看詳細內容 →"}
                        </Link>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-medium ${info.color}`}
                      >
                        {info.label}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        CampusFix © 2026 | Software Engineering Project
      </footer>
    </main>
  );
}

// Next.js 16：避免 useSearchParams 預先渲染錯誤
export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-500">
          正在載入通報頁面...
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
