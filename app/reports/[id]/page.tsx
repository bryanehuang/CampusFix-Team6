
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// 資料庫通報型別
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

// 狀態顯示設定
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

// 時間格式轉換
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
// S3：讀取指定通報的詳細資料
// 此元件會放在 Suspense 裡面
// ==========================================
function ReportDetailContent() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");
      setReport(null);
      setLoginRequired(false);

      try {
        // 1. 確認登入
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setLoginRequired(true);
          return;
        }

        // 2. 查詢指定通報
        const { data, error: queryError } = await supabase
          .from("reports")
          .select(
            "id,title,category,location,description,status,resolution,created_at"
          )
          .eq("id", reportId)
          .maybeSingle();

        if (!active) return;

        if (queryError) {
          setError(`查詢失敗：${queryError.message}`);
          return;
        }

        if (!data) {
          setError("找不到此通報，或你沒有查看權限。");
          return;
        }

        // 3. 儲存查詢結果
        setReport(data as Report);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "讀取通報時發生錯誤"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [reportId, refreshKey]);

  // 載入畫面
  if (loading) {
    return (
      <div className="mt-8 rounded-xl bg-white p-10 text-center text-slate-500">
        正在讀取通報資料...
      </div>
    );
  }

  // 尚未登入
  if (loginRequired) {
    return (
      <div className="mt-8 rounded-xl bg-white p-10 text-center">
        <h2 className="text-xl font-semibold">
          請先登入 CampusFix
        </h2>

        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-blue-700 px-6 py-3 text-white"
        >
          前往登入
        </Link>
      </div>
    );
  }

  // 查詢錯誤
  if (error) {
    return (
      <div
        role="alert"
        className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700"
      >
        {error}

        <button
          type="button"
          onClick={() => setRefreshKey((x) => x + 1)}
          className="mt-4 block text-sm font-medium underline"
        >
          重新查詢
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const statusInfo = getStatusInfo(report.status);

  // ==========================================
  // S3：詳細資料畫面
  // ==========================================
  return (
    <div className="mt-8 space-y-6">

      {/* 通報基本資訊 */}
      <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">
              {report.title}
            </h2>

            <p className="mt-3 break-all text-xs text-slate-400">
              通報編號：{report.id}
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* 通報欄位 */}
        <div className="mt-8 grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">

          <div>
            <p className="text-sm text-slate-500">
              問題分類
            </p>
            <p className="mt-2 font-medium">
              {report.category}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              發生地點
            </p>
            <p className="mt-2 font-medium">
              {report.location}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              提交時間
            </p>
            <p className="mt-2 font-medium">
              {formatDate(report.created_at)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              目前狀態
            </p>
            <p className="mt-2 font-medium">
              {statusInfo.label}
            </p>
          </div>
        </div>

        {/* 問題描述 */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-lg font-semibold">
            問題詳細描述
          </h3>

          <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">
            {report.description}
          </p>
        </div>
      </article>

      {/* 處理結果 */}
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold">
          處理結果
        </h3>

        {report.status === "Resolved" &&
        report.resolution ? (
          <p className="mt-4 whitespace-pre-wrap leading-8">
            {report.resolution}
          </p>
        ) : (
          <p className="mt-4 text-slate-500">
            此通報尚未結案，目前沒有處理結果。
          </p>
        )}
      </section>

      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/reports"
          className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800"
        >
          返回通報列表
        </Link>

        <button
          type="button"
          onClick={() => setRefreshKey((x) => x + 1)}
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 hover:bg-slate-100"
        >
          重新整理狀態
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Next.js 16：Suspense 動態路由修正
// ==========================================
export default function ReportDetailPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/reports"
          className="text-sm text-blue-700 hover:underline"
        >
          ← 返回通報列表
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          通報詳細資訊
        </h1>

        <Suspense
          fallback={
            <div className="mt-8 rounded-xl bg-white p-10 text-center text-slate-500">
              正在載入詳細頁面...
            </div>
          }
        >
          <ReportDetailContent />
        </Suspense>

      </div>
    </main>
  );
}
