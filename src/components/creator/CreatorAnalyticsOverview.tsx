"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  Download,
  Eye,
  FolderHeart,
  Heart,
  HeartHandshake,
  MessageSquare,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type {
  CreatorAnalyticsOverview as AnalyticsData,
  CreatorAnalyticsSnapshot,
} from "@/lib/creator-analytics";

type Period = 7 | 30 | 90 | 365;
type MetricKey =
  | "totalDownloads"
  | "totalViews"
  | "totalFavorites"
  | "totalCollections"
  | "totalComments"
  | "totalReviews"
  | "totalFollowers";

const periods: Array<{ value: Period; label: string }> = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 365, label: "365 ngày" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatFullNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function sanitizeDisplayName(value: string | null | undefined): string {
  const cleaned = (value ?? "")
    .normalize("NFKC")
    // Game/BBCode formatting tags such as [B], [C], [FF0000], [FFFF33].
    .replace(/\[(?:[A-Za-z]{1,12}|[0-9A-Fa-f]{6,8})\]/g, "")
    // Decorative block glyphs left behind by some in-game color-name formats.
    .replace(/[░▒▓█▤▥▦▧▨▩▰▱■□]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Creator";
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

function getPeriodSnapshots(
  snapshots: CreatorAnalyticsSnapshot[],
  period: Period,
): CreatorAnalyticsSnapshot[] {
  const cutoff = subtractDays(new Date(), period - 1)
    .toISOString()
    .slice(0, 10);
  return snapshots.filter((item) => item.date >= cutoff);
}

function metricDelta(
  snapshots: CreatorAnalyticsSnapshot[],
  key: MetricKey,
): { value: number; percent: number | null } {
  if (snapshots.length < 2) return { value: 0, percent: null };
  const first = snapshots[0][key];
  const last = snapshots[snapshots.length - 1][key];
  const value = last - first;
  return { value, percent: first > 0 ? (value / first) * 100 : null };
}

function GrowthBadge({
  value,
  percent,
}: {
  value: number;
  percent: number | null;
}) {
  if (percent === null) {
    return (
      <span className="text-xs font-semibold text-slate-500">
        Chưa đủ dữ liệu kỳ trước
      </span>
    );
  }
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
        positive
          ? "bg-emerald-400/10 text-emerald-300"
          : "bg-rose-400/10 text-rose-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {positive ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
}

function AnalyticsChart({
  snapshots,
  metricKey,
  metricLabel,
}: {
  snapshots: CreatorAnalyticsSnapshot[];
  metricKey: MetricKey;
  metricLabel: string;
}) {
  const width = 900;
  const height = 260;
  const paddingX = 18;
  const paddingY = 24;
  const values = snapshots.map((item) => item[metricKey]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = snapshots.map((item, index) => {
    const x =
      paddingX +
      (index / Math.max(1, snapshots.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((item[metricKey] - min) / range) * (height - paddingY * 2);
    return { x, y, item };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length
    ? `${paddingX},${height - paddingY} ${polyline} ${width - paddingX},${height - paddingY}`
    : "";

  if (snapshots.length < 2) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-8 text-center">
        <div>
          <BarChart3 className="mx-auto h-9 w-9 text-slate-600" />
          <p className="mt-4 font-bold text-slate-300">
            Đang xây dựng lịch sử Analytics
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Mỗi ngày mở Creator Studio, hệ thống sẽ lưu một snapshot mới. Biểu
            đồ tăng trưởng xuất hiện sau khi có ít nhất hai ngày dữ liệu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Biểu đồ ${metricLabel.toLowerCase()} theo ngày`}
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="currentColor"
            className="text-white/[0.06]"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={area}
          fill="currentColor"
          className="text-amber-400/10"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          className="text-amber-300"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle
            key={point.item.date}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="currentColor"
            className="text-amber-300"
          >
            <title>{`${point.item.date}: ${formatFullNumber(point.item[metricKey])} ${metricLabel.toLowerCase()}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-600">
        <span>{snapshots[0]?.date}</span>
        <span>{snapshots[snapshots.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export default function CreatorAnalyticsOverview({
  data,
}: {
  data: AnalyticsData;
}) {
  const [period, setPeriod] = useState<Period>(30);
  const creatorDisplayName = useMemo(
    () => sanitizeDisplayName(data.creatorName),
    [data.creatorName],
  );
  const [activeMetric, setActiveMetric] = useState<MetricKey>("totalDownloads");
  const periodSnapshots = useMemo(
    () => getPeriodSnapshots(data.snapshots, period),
    [data.snapshots, period],
  );

  const metricOptions: Array<{ key: MetricKey; label: string }> = [
    { key: "totalDownloads", label: "Lượt tải" },
    { key: "totalViews", label: "Lượt xem" },
    { key: "totalFavorites", label: "Tâm đắc" },
    { key: "totalCollections", label: "Tàng Kinh Các" },
    { key: "totalFollowers", label: "Đồng đạo" },
    { key: "totalReviews", label: "Luận đạo" },
    { key: "totalComments", label: "Luận bàn" },
  ];
  const activeMetricLabel =
    metricOptions.find((item) => item.key === activeMetric)?.label ?? "Chỉ số";
  const activeMetricDelta = metricDelta(periodSnapshots, activeMetric);

  const cards = [
    {
      label: "Lượt tải",
      value: data.totals.downloads,
      key: "totalDownloads" as const,
      icon: Download,
    },
    {
      label: "Lượt xem",
      value: data.totals.views,
      key: "totalViews" as const,
      icon: Eye,
    },
    {
      label: "Tâm đắc",
      value: data.totals.favorites,
      key: "totalFavorites" as const,
      icon: Heart,
    },
    {
      label: "Tàng Kinh Các",
      value: data.totals.collections,
      key: "totalCollections" as const,
      icon: FolderHeart,
    },
    {
      label: "Đồng đạo",
      value: data.totals.followers,
      key: "totalFollowers" as const,
      icon: HeartHandshake,
    },
    {
      label: "Luận đạo",
      value: data.totals.reviews,
      key: "totalReviews" as const,
      icon: Star,
    },
    {
      label: "Luận bàn",
      value: data.totals.comments,
      key: "totalComments" as const,
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.10),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(2,6,23,0.99))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              Creator Analytics
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Hiệu suất của {creatorDisplayName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Theo dõi tổng quan lượt tải, tương tác cộng đồng và mức tăng
              trưởng của toàn bộ mod thuộc tài khoản này.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-1.5">
            {periods.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  period === item.value
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <Boxes className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">
              Tổng mod
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatFullNumber(data.totals.mods)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
            <Star className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">
              Điểm trung bình
            </p>
            <p className="mt-1 text-2xl font-black">
              {data.totals.averageRating
                ? `${data.totals.averageRating.toFixed(2)}★`
                : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 lg:col-span-2">
            <CalendarDays className="h-5 w-5 text-amber-300" />
            <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-500">
              Dữ liệu Analytics
            </p>
            <p className="mt-1 text-lg font-black">
              {data.snapshots.length} ngày snapshot
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cập nhật gần nhất:{" "}
              {new Date(data.generatedAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, key, icon: Icon }) => {
          const delta = metricDelta(periodSnapshots, key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveMetric(key)}
              className={`rounded-3xl border p-5 text-left shadow-xl shadow-black/10 transition ${
                activeMetric === key
                  ? "border-amber-300/40 bg-amber-300/[0.08]"
                  : "border-white/10 bg-slate-900/70 hover:border-white/20 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-white/5 p-3 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
                <GrowthBadge {...delta} />
              </div>
              <p className="mt-5 text-sm font-bold text-slate-400">{label}</p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {formatNumber(value)}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Tổng hiện tại · {period} ngày gần nhất
              </p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  Tăng trưởng {activeMetricLabel.toLowerCase()}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dữ liệu cộng dồn theo snapshot trong {period} ngày gần nhất.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Thay đổi trong kỳ
                </p>
                <p
                  className={`mt-1 text-xl font-black ${activeMetricDelta.value >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                >
                  {periodSnapshots.length >= 2
                    ? `${activeMetricDelta.value >= 0 ? "+" : ""}${formatFullNumber(activeMetricDelta.value)}`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveMetric(item.key)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                    activeMetric === item.key
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <AnalyticsChart
            snapshots={periodSnapshots}
            metricKey={activeMetric}
            metricLabel={activeMetricLabel}
          />
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-black">Tóm tắt tương tác</h2>
          <div className="mt-5 grid gap-3">
            {[
              [
                "Tỷ lệ tâm đắc / lượt tải",
                data.totals.downloads
                  ? (data.totals.favorites / data.totals.downloads) * 100
                  : 0,
              ],
              [
                "Tỷ lệ luận đạo / lượt tải",
                data.totals.downloads
                  ? (data.totals.reviews / data.totals.downloads) * 100
                  : 0,
              ],
              [
                "Luận bàn trên mỗi mod",
                data.totals.mods ? data.totals.comments / data.totals.mods : 0,
              ],
              [
                "Collection trên mỗi mod",
                data.totals.mods
                  ? data.totals.collections / data.totals.mods
                  : 0,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-sm font-bold text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-black">
                  {Number(value).toFixed(2)}
                  {String(label).includes("Tỷ lệ") ? "%" : ""}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <article className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Hiệu suất theo mod</h2>
              <p className="mt-1 text-sm text-slate-500">
                Xếp theo tổng lượt tải hiện tại.
              </p>
            </div>
            <Link
              href="/creator/mods"
              className="text-sm font-black text-amber-300 hover:text-amber-200"
            >
              Quản lý mod
            </Link>
          </div>
          <div className="mt-5 min-w-0 overflow-hidden">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-600">
                <tr className="border-b border-white/10">
                  <th className="w-[46%] px-2 py-3 sm:px-3">Mod</th>
                  <th className="w-[18%] px-2 py-3 text-right sm:px-3">
                    Lượt tải
                  </th>
                  <th className="hidden w-[18%] px-2 py-3 text-right lg:table-cell sm:px-3">
                    Tâm đắc
                  </th>
                  <th className="w-[18%] px-2 py-3 text-right sm:px-3">
                    Luận đạo
                  </th>
                  <th className="hidden w-[18%] px-2 py-3 text-right 2xl:table-cell sm:px-3">
                    Luận bàn
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topMods.map((mod) => (
                  <tr
                    key={mod.id}
                    className="border-b border-white/[0.06] last:border-0"
                  >
                    <td className="min-w-0 px-2 py-4 sm:px-3">
                      <Link
                        href={`/mods/${mod.slug}`}
                        className="flex min-w-0 items-center gap-2 font-bold hover:text-amber-300 sm:gap-3"
                      >
                        <img
                          src={mod.coverUrl || "/images/mod-placeholder.jpg"}
                          alt=""
                          className="h-9 w-12 shrink-0 rounded-lg object-cover sm:h-10 sm:w-16"
                        />
                        <span className="min-w-0 truncate" title={mod.title}>
                          {mod.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-4 text-right font-black sm:px-3">
                      {formatNumber(mod.downloads)}
                    </td>
                    <td className="hidden px-2 py-4 text-right lg:table-cell sm:px-3">
                      {formatNumber(mod.favorites)}
                    </td>
                    <td className="px-2 py-4 text-right sm:px-3">
                      {mod.reviews
                        ? `${mod.averageRating.toFixed(1)}★ (${mod.reviews})`
                        : "—"}
                    </td>
                    <td className="hidden px-2 py-4 text-right 2xl:table-cell sm:px-3">
                      {formatNumber(mod.comments)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.topMods.length === 0 && (
              <p className="p-10 text-center text-sm text-slate-500">
                Chưa có mod để phân tích.
              </p>
            )}
          </div>
        </article>

        <article className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-black">Phiên bản nổi bật</h2>
          <p className="mt-1 text-sm text-slate-500">
            Top release theo lượt tải đã ghi nhận.
          </p>
          <div className="mt-5 grid gap-3">
            {data.topVersions.length ? (
              data.topVersions.map((version, index) => (
                <div
                  key={version.id}
                  className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0 overflow-hidden">
                      <p
                        className="line-clamp-2 break-words font-bold leading-5"
                        title={version.modTitle}
                      >
                        {version.modTitle}
                      </p>
                      <p className="mt-1 text-xs font-black text-amber-300">
                        #{index + 1} · v{version.version}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-right text-lg font-black">
                      {formatNumber(version.downloads)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                Chưa có dữ liệu tải theo phiên bản. Các lượt tải mới qua Version
                Download API sẽ được ghi nhận tại đây.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
