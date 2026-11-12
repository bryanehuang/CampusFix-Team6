
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ==========================================
// CampusFix - Staff Management
// ==========================================

const supabase = createClient();

// ==========================================
// 資料型別
// ==========================================

type ReportStatus = "Submitted" | "In Progress" | "Resolved";

type StatusFilter = "All" | ReportStatus;

type AccessState =
  | "checking"
  | "guest"
  | "denied"
  | "staff"
  | "error";

type Report = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
};

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

// ==========================================
// 狀態文字與顏色
// ==========================================

const statusText: Record<ReportStatus, string> = {
  Submitted: "待處理",
  "In Progress": "處理中",
  Resolved: "已結案",
};

const statusStyle: Record<ReportStatus, string> = {
  Submitted: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
};

// ==========================================
// 時間格式
// ==========================================

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-TW", {
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
// Staff 管理頁面
// ==========================================

export default function StaffPage() {
  // 工作人員權限
  const [access, setAccess] =
    useState<AccessState>("checking");

  const [accessError, setAccessError] = useState("");

  // 通報資料
  const [reports, setReports] = useState<Report[]>([]);

  const [loadingReports, setLoadingReports] =
    useState(false);

  const [reportsError, setReportsError] = useState("");

  // 篩選條件
  const [filter, setFilter] =
    useState<StatusFilter>("All");

  // 正在處理的通報
  const [busyId, setBusyId] =
    useState<string | null>(null);

  // 各通報的結案內容
  const [drafts, setDrafts] =
    useState<Record<string, string>>({});

  // 操作訊息
  const [notice, setNotice] =
    useState<Notice>(null);

  // ==========================================
  // S6：讀取通報資料
  // ==========================================

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setReportsError("");

    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id,title,category,location,description,status,resolution,created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw error;
      }

      setReports((data ?? []) as Report[]);

    } catch (error) {
      setReportsError(
        error instanceof Error
          ? error.message
          : "讀取通報失敗，請稍後再試。"
      );

    } finally {
      setLoadingReports(false);
    }
  }, []);

  // ==========================================
  // 檢查登入與 Staff 身分
  // ==========================================

  const checkAccess = useCallback(async () => {
    setAccess("checking");
    setAccessError("");

    try {
      // 取得登入使用者
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAccess("guest");
        return;
      }

      // 查詢是否具有 Staff 身分
      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff_members")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (staffError) {
        throw staffError;
      }

      // 有工作人員資格才可以進入
      setAccess(staff ? "staff" : "denied");

    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : "工作人員身分確認失敗。"
      );

      setAccess("error");
    }
  }, []);

  // ==========================================
  // 頁面載入時檢查權限
  // ==========================================

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  // Staff 登入後載入通報
  useEffect(() => {
    if (access === "staff") {
      void loadReports();
    }
  }, [access, loadReports]);

  // ==========================================
  // 通報狀態統計
  // ==========================================

  const counts = useMemo(
    () => ({
      Submitted: reports.filter(
        (report) => report.status === "Submitted"
      ).length,

      "In Progress": reports.filter(
        (report) => report.status === "In Progress"
      ).length,

      Resolved: reports.filter(
        (report) => report.status === "Resolved"
      ).length,
    }),
    [reports]
  );

  // ==========================================
  // 通報狀態篩選
  // ==========================================

  const visibleReports = useMemo(() => {
    if (filter === "All") {
      return reports;
    }

    return reports.filter(
      (report) => report.status === filter
    );
  }, [reports, filter]);

  // ==========================================
  // S7：開始處理通報
  // Submitted → In Progress
  // ==========================================

  async function startProcessing(report: Report) {
    if (busyId) return;

    setBusyId(report.id);
    setNotice(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: "In Progress",
        })
        .eq("id", report.id)
        .eq("status", "Submitted")
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "未能更新案件，可能已被其他工作人員處理。請重新整理。"
        );
      }

      // 更新列表
      await loadReports();

      setNotice({
        type: "success",
        text: `「${report.title}」已更新為處理中。`,
      });

    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "開始處理失敗。",
      });

    } finally {
      setBusyId(null);
    }
  }

  // ==========================================
  // S8：完成結案
  // In Progress → Resolved
  // ==========================================

  async function finishProcessing(report: Report) {
    if (busyId) return;

    const resolution =
      (drafts[report.id] ?? "").trim();

    // 檢查結案說明
    if (
      resolution.length < 10 ||
      resolution.length > 2000
    ) {
      setNotice({
        type: "error",
        text: "結案說明需要 10～2000 個字元。",
      });
      return;
    }

    setBusyId(report.id);
    setNotice(null);

    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          status: "Resolved",
          resolution,
        })
        .eq("id", report.id)
        .eq("status", "In Progress")
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "未能完成結案，可能通報狀態已改變。請重新整理。"
        );
      }

      // 清除結案草稿
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[report.id];
        return next;
      });

      // 更新資料
      await loadReports();

      setNotice({
        type: "success",
        text: `「${report.title}」已完成結案。`,
      });

    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "完成結案失敗。",
      });

    } finally {
      setBusyId(null);
    }
  }

  // ==========================================
  // 工作人員管理介面
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-800">

      <div className="mx-auto max-w-5xl">

        {/* 返回首頁 */}
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← 返回首頁
        </Link>

        {/* 頁面標題 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              工作人員管理系統
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              檢視、處理及結案校園問題通報
            </p>
          </div>

          {access === "staff" && (
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={
                loadingReports ||
                busyId !== null
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              {loadingReports
                ? "整理中..."
                : "重新整理"}
            </button>
          )}
        </div>

        {/* ====================================
            權限確認中
           ==================================== */}

        {access === "checking" && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            正在確認工作人員權限...
          </div>
        )}

        {/* ====================================
            未登入
           ==================================== */}

        {access === "guest" && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-white p-8 text-center">

            <h2 className="text-xl font-bold text-amber-700">
              請先登入
            </h2>

            <p className="mt-2 text-slate-500">
              工作人員管理系統需要登入後使用。
            </p>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-white hover:bg-blue-800"
            >
              前往登入
            </Link>

          </div>
        )}

        {/* ====================================
            一般學生沒有權限
           ==================================== */}

        {access === "denied" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-white p-8 text-center">

            <h2 className="text-xl font-bold text-red-700">
              沒有工作人員權限
            </h2>

            <p className="mt-2 text-slate-500">
              此帳號未被授權使用工作人員管理系統。
            </p>

            <Link
              href="/reports"
              className="mt-5 inline-block text-sm font-medium text-blue-700 hover:underline"
            >
              返回學生通報列表 →
            </Link>

          </div>
        )}

        {/* ====================================
            權限驗證錯誤
           ==================================== */}

        {access === "error" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-white p-6">

            <p className="font-semibold text-red-700">
              確認權限時發生錯誤
            </p>

            <p className="mt-2 break-words text-sm text-slate-600">
              {accessError}
            </p>

            <button
              type="button"
              onClick={() => void checkAccess()}
              className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white"
            >
              重試
            </button>

          </div>
        )}

        {/* ====================================
            Staff 管理功能
           ==================================== */}

        {access === "staff" && (
          <>

            {/* 狀態統計 */}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">

              {[
                {
                  status: "Submitted" as const,
                  value: counts.Submitted,
                  color: "text-amber-700",
                },
                {
                  status: "In Progress" as const,
                  value: counts["In Progress"],
                  color: "text-blue-700",
                },
                {
                  status: "Resolved" as const,
                  value: counts.Resolved,
                  color: "text-emerald-700",
                },
              ].map((item) => (
                <div
                  key={item.status}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">
                    {statusText[item.status]}
                  </p>

                  <p
                    className={`mt-1 text-3xl font-bold ${item.color}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}

            </div>

            {/* =================================
                狀態篩選
               ================================= */}

            <div className="mt-7 flex flex-wrap gap-3">

              {[
                {
                  key: "All" as const,
                  title: "全部",
                },
                {
                  key: "Submitted" as const,
                  title: "待處理",
                },
                {
                  key: "In Progress" as const,
                  title: "處理中",
                },
                {
                  key: "Resolved" as const,
                  title: "已結案",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  aria-pressed={filter === item.key}
                  className={
                    filter === item.key
                      ? "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
                  }
                >
                  {item.title}
                </button>
              ))}

            </div>

            {/* 成功或錯誤訊息 */}
            {notice && (
              <div
                role={
                  notice.type === "error"
                    ? "alert"
                    : "status"
                }
                className={
                  notice.type === "error"
                    ? "mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    : "mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                }
              >
                {notice.text}
              </div>
            )}

            {/* 讀取資料錯誤 */}
            {reportsError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                讀取通報失敗：{reportsError}
              </div>
            )}

            {/* 通報數量 */}
            <p className="mt-5 text-sm text-slate-500">
              顯示 {visibleReports.length} 筆通報
              （最多讀取最近 100 筆）
            </p>

            {/* =================================
                通報列表
               ================================= */}

            <div className="mt-4 space-y-5">

              {/* 載入中 */}
              {loadingReports &&
                reports.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    正在載入通報...
                  </div>
                )}

              {/* 沒有資料 */}
              {!loadingReports &&
                !reportsError &&
                visibleReports.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    目前沒有符合條件的通報。
                  </div>
                )}

              {/* 每一筆通報 */}
              {visibleReports.map((report) => {

                const isBusy =
                  busyId === report.id;

                const controlsDisabled =
                  busyId !== null ||
                  loadingReports;

                return (
                  <article
                    key={report.id}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >

                    {/* 通報資訊 */}
                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div className="min-w-0 flex-1">

                        <h2 className="break-words text-xl font-semibold">
                          {report.title}
                        </h2>

                        <p className="mt-3 text-sm text-slate-500">
                          分類：{report.category}
                          {"　"}
                          地點：{report.location}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          通報時間：
                          {formatDate(report.created_at)}
                        </p>

                      </div>

                      {/* 狀態標籤 */}
                      <span
                        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                          statusStyle[report.status] ??
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusText[report.status] ??
                          report.status}
                      </span>

                    </div>

                    {/* 問題描述 */}
                    <div className="mt-5 border-t border-slate-200 pt-5">

                      <h3 className="font-semibold">
                        問題描述
                      </h3>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                        {report.description}
                      </p>

                    </div>

                    {/* =================================
                        In Progress：結案表單
                       ================================= */}

                    {report.status === "In Progress" && (
                      <div className="mt-5 rounded-lg bg-slate-50 p-5">

                        <label
                          htmlFor={`resolution-${report.id}`}
                          className="mb-3 block text-sm font-semibold"
                        >
                          填寫處理結果
                        </label>

                        <textarea
                          id={`resolution-${report.id}`}
                          rows={4}
                          maxLength={2000}
                          value={drafts[report.id] ?? ""}
                          onChange={(event) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [report.id]:
                                event.target.value,
                            }))
                          }
                          disabled={controlsDisabled}
                          placeholder="例如：已完成維修並確認設備恢復正常..."
                          className="w-full rounded-lg border border-slate-300 bg-white p-4 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        />

                      </div>
                    )}

                    {/* =================================
                        Resolved：已結案結果
                       ================================= */}

                    {report.status === "Resolved" && (
                      <div className="mt-5 rounded-lg bg-emerald-50 p-5">

                        <h3 className="font-semibold text-emerald-900">
                          處理結果
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                          {report.resolution ||
                            "此通報尚未提供處理結果。"}
                        </p>

                      </div>
                    )}

                    {/* =================================
                        操作按鈕區域

                        gap-5 = 20px 間距
                        flex-wrap = 手機自動換行
                       ================================= */}

                    <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-5">

                      {/* 開始處理按鈕 */}
                      {report.status === "Submitted" && (
                        <button
                          type="button"
                          onClick={() =>
                            void startProcessing(report)
                          }
                          disabled={controlsDisabled}
                          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy
                            ? "處理中..."
                            : "開始處理"}
                        </button>
                      )}

                      {/* 完成結案按鈕 */}
                      {report.status === "In Progress" && (
                        <button
                          type="button"
                          onClick={() =>
                            void finishProcessing(report)
                          }
                          disabled={controlsDisabled}
                          className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy
                            ? "儲存中..."
                            : "完成結案"}
                        </button>
                      )}

                      {/* 查看學生端詳細頁面 */}
                      <Link
                        href={`/reports/${encodeURIComponent(
                          report.id
                        )}`}
                        className="inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
                      >
                        查看學生端詳細頁面 →
                      </Link>

                    </div>

                  </article>
                );
              })}

            </div>
          </>
        )}

      </div>
    </main>
  );
}
