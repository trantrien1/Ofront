import moment from "moment-timezone";

/**
 * Format a Date or date-like value into an absolute string in the given timezone.
 * Default locale: vi-VN (can be overridden via passing a different locale outside).
 */
export const absoluteInTz = (
  d: Date | string,
  tz: string = "Asia/Ho_Chi_Minh",
  locale: string = "vi-VN"
): string => {
  try {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz,
    }).format(dateObj);
  } catch {
    return "--/--/----";
  }
};

/**
 * Relative time (Vietnamese) with simple thresholds.
 * Input should already be normalized to desired timezone (but only diff matters).
 */
export const formatTimeAgo = (d: Date): string => {
  const now = new Date();
  const diffSec = (now.getTime() - d.getTime()) / 1000;
  if (!isFinite(diffSec)) return "Vừa xong";
  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days} ngày trước`;
  // Fallback to absolute date (without time) after ~1 month
  return absoluteInTz(d, "Asia/Ho_Chi_Minh").split(",")[0];
};

/**
 * Normalize any timestamp-ish input to a Date adjusted to the target timezone using moment-timezone.
 * Accepts: Date | string | number | Firestore Timestamp-like (seconds / toDate)
 */
export const normalizeTimestamp = (ts: any, tz: string = "Asia/Ho_Chi_Minh"): Date => {
  try {
    if (!ts) return moment().tz(tz).toDate();
    if (ts instanceof Date) return moment(ts).tz(tz).toDate();
    if (typeof ts === "number") {
      // treat numbers < 1e12 as seconds
      const ms = ts < 1e12 ? ts * 1000 : ts;
      return moment(ms).tz(tz).toDate();
    }
    if (typeof ts === "object") {
      if (typeof ts.toDate === "function") return moment(ts.toDate()).tz(tz).toDate();
      if (typeof ts.seconds === "number") {
        const ms = ts.seconds * 1000 + (ts.nanoseconds ? Math.floor(ts.nanoseconds / 1e6) : 0);
        return moment(ms).tz(tz).toDate();
      }
    }
    if (typeof ts === "string") {
      // Trim excessive fractional part to milliseconds (avoid invalid Date in some browsers)
      let s = ts.trim();
      if (/\.(\d{3})\d+Z?$/.test(s)) s = s.replace(/\.(\d{3})\d+(Z?)/, ".$1$2");
      return moment(s).tz(tz).toDate();
    }
    return moment(ts).tz(tz).toDate();
  } catch {
    return new Date();
  }
};

/**
 * Utility to choose absolute (SSR) vs relative (client). If used directly in render, remember hydration differences.
 */
export const ssrSafeTimeLabel = (input: any, tz: string = "Asia/Ho_Chi_Minh") => {
  const d = normalizeTimestamp(input, tz);
  if (typeof window === "undefined") return absoluteInTz(d, tz); // SSR
  return formatTimeAgo(d); // Client
};
