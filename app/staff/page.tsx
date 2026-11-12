
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ==========================================
// 資料型別
// ==========================================

type Report = {
  id: string;
  title: string;
  category: string;
  location: string;
  description: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

type AccessState =
  | "loading"
  | "login"
  | "denied"
  | "staff"
  | "error";

type StatusFilter =
  | "All"
  | "Submitted"
  | "In Progress"
  | "Resolved";

// ==========================================
// 狀態顯示
// ==========================================

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
// 工作人員管理頁面
// ==========================================

export default function StaffPage() {
  const [access, setAccess] =
    useState<AccessState>("loading");

  const [reports, setReports] = useState<Report[]>([]);

  const [filter, setFilter] =
    useState<StatusFilter>("All");

  const [drafts, setDrafts] =
    useState<Record<string, string>>({});

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ==========================================
  // S6：驗證 Staff 身分並讀取通報
  // ==========================================

  useEffect(() => {
    let active = true;

    async function loadData() {
      setAccess("loading");
      setError("");

      try {
        // 1. 驗證登入使用者
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setAccess("login");
          return;
        }

        // 2. 確認是否在 staff_members
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
            "工作人員權限查詢失敗：" +
            staffError.message
          );
        }

        if (!staff) {
          setAccess("denied");
          return;
        }

        // 3. 讀取通報資料
        const {
          data,
          error: reportsError,
        } = await supabase
          .from("reports")
          .select(
            "id,title,category,location,description,status,resolution,created_at"
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

        if (!active) return;

        if (reportsError) {
          throw new Error(reportsError.message);
        }

        setReports((data ?? []) as Report[]);
        setAccess("staff");

      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "無法讀取資料"
        );

        setAccess("error");
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // ==========================================
  // S7 + S8：更新通報處理狀態
  // ==========================================

  async function updateReport(
    report: Report,
    nextStatus: "In Progress" | "Resolved"
  ) {
    if (busyId) return;

    setError("");
    setMessage("");

    const isResolving = nextStatus === "Resolved";
    const resolution = (drafts[report.id] ?? "").trim();

    // 基本流程檢查
    if (
      nextStatus === "In Progress" &&
      report.status !== "Submitted"
    ) {
      setError("只有待處理通報可以開始處理。");
      return;
    }

    if (
      isResolving &&
      report.status !== "In Progress"
    ) {
      setError("請先開始處理，再進行結案。");
      return;
    }

    if (isResolving && resolution.length < 10) {
      setError("結案說明至少需要 10 個字。");
      return;
    }

    setBusyId(report.id);

    try {
      // 再次確認登入狀態
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("登入已失效，請重新登入。");
      }

      // 僅修改狀態及結案說明
      const updates = isResolving
        ? {
            status: "Resolved",
            resolution: resolution,
          }
        : {
            status: "In Progress",
          };

      const {
        data,
        error: updateError,
      } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", report.id)
        .eq("status", report.status)
        .select("id,status")
        .maybeSingle();

      if (updateError) {
        throw new Error(updateError.message);
      }

      // 無資料更新時，不可顯示成功
      if (!data) {
        throw new Error(
          "更新未成功：可能沒有修改權限，或通報狀態已被其他人更新。"
        );
      }

      setMessage(
        isResolving
          ? `「${report.title}」已完成結案。`
          : `「${report.title}」已開始處理。`
      );

      // 更新成功後重新讀取列表
      setRefreshKey((value) => value + 1);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "更新失敗"
      );
    } finally {
      setBusyId(null);
    }
  }

  // ==========================================
  // 篩選與統計
  // ==========================================

  const visibleReports =
    filter === "All"
      ? reports
      : reports.filter((r) => r.status === filter);

  const submittedCount = reports.filter(
    (r) => r.status === "Submitted"
  ).length;

  const progressCount = reports.filter(
    (r) => r.status === "In Progress"
  ).length;

  const resolvedCount = reports.filter(
    (r) => r.status === "Resolved"
  ).length;

  // ==========================================
  // 畫面
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">

      {/* 上方導覽 */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold text-blue-700"
          >
            CampusFix
          </Link>

          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm">
            Staff Management
          </span>
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
              工作人員管理系統
            </h1>

            <p className="mt-3 text-slate-500">
              檢視、處理及結案校園問題通報
            </p>
          </div>

          <button
            type="button"
            disabled={access === "loading" || busyId !== null}
            onClick={() => setRefreshKey((x) => x + 1)}
            className="rounded-lg border bg-white px-5 py-3 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            重新整理
          </button>
        </div>

        {/* 載入中 */}
        {access === "loading" && (
          <div className="mt-8 rounded-xl bg-white p-10 text-center">
            正在檢查工作人員權限...
          </div>
        )}

        {/* 尚未登入 */}
        {access === "login" && (
          <div className="mt-8 rounded-xl bg-white p-10 text-center">
            <h2 className="text-xl font-bold">
              請先登入
            </h2>

            <p className="mt-3 text-slate-500">
              工作人員必須登入才能使用管理功能。
            </p>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-blue-700 px-6 py-3 text-white"
            >
              前往登入
            </Link>
          </div>
        )}

        {/* 非工作人員 */}
        {access === "denied" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-red-700">
              沒有工作人員權限
            </h2>

            <p className="mt-3 text-slate-500">
              此帳號未被授權使用工作人員管理系統。
            </p>
          </div>
        )}

        {/* 錯誤 */}
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {access === "error" && (
          <p className="mt-4 text-slate-500">
            請確認 Supabase 資料表、RLS 及連線設定。
          </p>
        )}

        {/* 成功訊息 */}
        {message && access === "staff" && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {message}
          </div>
        )}

        {access === "staff" && (
          <>
            {/* 統計區域 */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-slate-500">
                  待處理
                </p>
                <p className="mt-2 text-3xl font-bold text-yellow-700">
                  {submittedCount}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-slate-500">
                  處理中
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {progressCount}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6">
                <p className="text-sm text-slate-500">
                  已結案
                </p>
                <p className="mt-2 text-3xl font-bold text-green-700">
                  {resolvedCount}
                </p>
              </div>
            </div>

            {/* 狀態篩選 */}
            <div className="mt-8 flex flex-wrap gap-3">
              {(
                [
                  ["All", "全部"],
                  ["Submitted", "待處理"],
                  ["In Progress", "處理中"],
                  ["Resolved", "已結案"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={
                    filter === value
                      ? "rounded-lg bg-blue-700 px-5 py-2 text-sm text-white"
                      : "rounded-lg border bg-white px-5 py-2 text-sm hover:bg-slate-100"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm text-slate-500">
              顯示 {visibleReports.length} 筆通報
              （最多讀取最新 100 筆）
            </p>

            {visibleReports.length === 0 && (
              <div className="mt-5 rounded-xl bg-white p-10 text-center text-slate-500">
                目前沒有符合條件的通報。
              </div>
            )}

            {/* S6：通報管理卡片 */}
            <div className="mt-5 space-y-5">
              {visibleReports.map((report) => {
                const statusInfo =
                  getStatusInfo(report.status);

                return (
                  <article
                    key={report.id}
                    className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold">
                          {report.title}
                        </h2>

                        <p className="mt-3 text-sm text-slate-500">
                          分類：{report.category}
                          {"　"}地點：{report.location}
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                          通報時間：
                          {formatDate(report.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="mt-5 border-t pt-5">
                      <h3 className="font-semibold">
                        問題描述
                      </h3>

                      <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                        {report.description}
                      </p>
                    </div>

                    {/* S7：開始處理 */}
                    {report.status === "Submitted" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          updateReport(
                            report,
                            "In Progress"
                          )
                        }
                        className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {busyId === report.id
                          ? "更新中..."
                          : "開始處理"}
                      </button>
                    )}

                    {/* S8：結案 */}
                    {report.status === "In Progress" && (
                      <div className="mt-6 rounded-lg bg-slate-50 p-5">
                        <label
                          htmlFor={`resolution-${report.id}`}
                          className="block font-semibold"
                        >
                          填寫處理結果
                        </label>

                        <textarea
                          id={`resolution-${report.id}`}
                          value={drafts[report.id] ?? ""}
                          onChange={(e) =>
                            setDrafts((old) => ({
                              ...old,
                              [report.id]: e.target.value,
                            }))
                          }
                          rows={4}
                          maxLength={2000}
                          placeholder="例如：已安排維修並確認設備恢復正常..."
                          className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-4"
                        />

                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() =>
                            updateReport(
                              report,
                              "Resolved"
                            )
                          }
                          className="mt-4 rounded-lg bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          {busyId === report.id
                            ? "結案中..."
                            : "完成結案"}
                        </button>
                      </div>
                    )}

                    {/* 已結案結果 */}
                    {report.status === "Resolved" && (
                      <div className="mt-6 rounded-lg bg-green-50 p-5">
                        <h3 className="font-semibold text-green-800">
                          處理完成
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap text-green-900">
                          {report.resolution ||
                            "未提供處理說明"}
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/reports/${report.id}`}
                      className="mt-5 inline-block text-sm text-blue-700 hover:underline"
                    >
                      查看學生端詳細頁面 →
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
