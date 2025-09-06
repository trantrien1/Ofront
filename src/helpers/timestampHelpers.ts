import moment from "moment-timezone";
/**
 * Convert timestamp UTC từ server về Date object theo múi giờ user.
 * @param ts timestamp từ server (ISO string, number, Date, Firestore Timestamp)
 * @param tz (optional) timeZone, default Asia/Ho_Chi_Minh
 */
type Timestamp = any;

/**
 * Convert Firestore timestamp to ISO string for consistent server-client rendering
 */
// export const timestampToISO = (timestamp: Timestamp | null | undefined): string => {
//   // Reuse the robust normalizer so we support Date, Firestore Timestamp, number, and string
//   try {
//     return normalizeTimestamp(timestamp);
//   } catch {
//     return new Date().toISOString();
//   }
// };

/**
 * Format timestamp to relative time (e.g., "5 minutes ago").
 * Accepts Date or string. On SSR, returns a static UTC+7 date to avoid hydration mismatch.
 */
const absoluteInTz = (d: Date, withTime = true, tz = 'Asia/Ho_Chi_Minh'): string => {
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tz }
    : { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz };
  return new Intl.DateTimeFormat(undefined, opts).format(d);
};

/**
 * SSR + Client safe relative time:
 * - Trên server: ép timezone Asia/Ho_Chi_Minh và trả text tuyệt đối (tránh sai lệch 7h và hydration warning)
 * - Trên client: hiển thị tương đối ("x phút trước")
 * Nếu muốn luôn tương đối, dùng <RelativeTime /> component bên dưới.
 */
export function formatTimeAgo(date: Date | string, opts: { forceRelative?: boolean; tz?: string } = {}): string {
  const { forceRelative = false, tz = 'Asia/Ho_Chi_Minh' } = opts;
  if (!date) return 'Vừa xong';
  const value = typeof date === 'string' ? normalizeTimestamp(date, tz) : normalizeTimestamp(date, tz);
  if (isNaN(value.getTime())) return '—';

  const isServer = typeof window === 'undefined';
  if (isServer && !forceRelative) {
    // Trả về thời gian tuyệt đối ở TZ chuẩn hóa để client render lại relative không gây nhảy 7h
    return absoluteInTz(value, true, tz);
  }

  const now = new Date();
  const diffSec = (now.getTime() - value.getTime()) / 1000;
  if (diffSec < 0) return 'Vừa xong';
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return value.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * React hook + component để hiển thị relative time không bị lệch giờ lúc SSR.
 * Cách dùng: <RelativeTime value={post.createdAt} />
 */
import { useEffect, useState } from 'react';
export function useRelativeTime(value: Date | string | undefined | null, options?: { tz?: string }) {
  const tz = options?.tz || 'Asia/Ho_Chi_Minh';
  const [text, setText] = useState(() => formatTimeAgo(value as any, { tz }));
  useEffect(() => {
    setText(formatTimeAgo(value as any, { tz, forceRelative: true }));
    const interval = setInterval(() => {
      setText(formatTimeAgo(value as any, { tz, forceRelative: true }));
    }, 60_000); // update mỗi phút
    return () => clearInterval(interval);
  }, [value, tz]);
  return text;
}

// NOTE: This file is .ts (not .tsx). To avoid JSX parse issues, expose a helper that returns the string.
export function getRelativeTimeLabel(value: Date | string | null | undefined, tz: string = 'Asia/Ho_Chi_Minh', placeholder = '—') {
  const d = value || null;
  if (!d) return placeholder;
  return formatTimeAgo(d as any, { tz, forceRelative: true });
}

/**
 * Get current timestamp as ISO string for consistent storage
 */
export const getCurrentTimestampISO = (): string => {
  return new Date().toISOString();
};

/**
 * Format a date/time in UTC+7 (Asia/Ho_Chi_Minh) as a date string.
 * Example output (en-US): 08/22/2024; (vi-VN): 22/08/2024
 */
export const formatUTCDate = (input: string | number | Date): string => {
  try {
    const d = new Date(input);
    // Force UTC+7 timezone
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  } catch {
  // Keep fallback consistent: use same formatter on current date
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }
};

/**
 * Format a date/time in UTC+7 (Asia/Ho_Chi_Minh) with time components.
 * Example (en-GB): 22/08/2024, 14:05:30
 */
export const formatUTCDateTime = (input: string | number | Date): string => {
  try {
    const d = new Date(input);
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  } catch {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  }
};

/**
 * Convert any timestamp format to ISO string
 */
// utils/datetime.ts
function normalizeIsoString(s: string): string {
  let x = s.trim();

  // Nếu có phần thập phân giây -> cắt còn 3 chữ số (ms). VD .052714 -> .052
  if (/\.\d+$/.test(x)) {
    x = x.replace(/\.(\d{3})\d*$/, ".$1");
  }

  // Nếu chưa có Z hoặc offset thì thêm Z (UTC)
  if (!/Z$|[+\-]\d{2}:\d{2}$/.test(x)) {
    x += "Z";
  }
  return x;
}


/**
 * Chuẩn hoá timestamp bất kỳ về Date theo múi giờ (mặc định Asia/Ho_Chi_Minh).
 * Trả về Invalid Date nếu không parse được (có thể kiểm tra bằng isNaN(d.getTime())).
 */
export function normalizeTimestamp(
  ts: any,
  tz: string = "Asia/Ho_Chi_Minh"
): Date {
  let base: Date = new Date(NaN);

  if (!ts) {
    base = new Date(NaN);
  } else if (typeof ts === "object" && typeof ts.toDate === "function") {
    // Firestore Timestamp
    base = ts.toDate();
  } else if (typeof ts === "object" && typeof ts.seconds === "number") {
    // Firestore dạng {seconds, nanoseconds}
    const ms = ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    base = new Date(ms);
  } else if (typeof ts === "number") {
    // Epoch: nếu < 1e12 coi là giây, ngược lại là ms
    const ms = ts < 1e12 ? ts * 1000 : ts;
    base = new Date(ms);
  } else if (typeof ts === "string") {
    const s = normalizeIsoString(ts);
    base = new Date(s);
  } else if (ts instanceof Date) {
    base = ts;
  } else {
    base = new Date(NaN);
  }

  if (isNaN(base.getTime())) return base; // Invalid Date

  // Chuyển sang giờ theo tz yêu cầu
  return moment(base).tz(tz).toDate();
}

/**
 * Explicit helper: convert raw UTC string/date to Date in specified timezone (default Asia/Ho_Chi_Minh)
 */
export function normalizeTimestampUTC(ts: any, tz: string = 'Asia/Ho_Chi_Minh'): Date {
  return normalizeTimestamp(ts, tz);
}