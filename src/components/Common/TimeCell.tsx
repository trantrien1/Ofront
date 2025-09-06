import React, { useEffect, useState } from "react";
import { absoluteInTz, formatTimeAgo, normalizeTimestamp } from "../../helpers/time";

export interface TimeCellProps {
  createdAt: string | number | Date | { seconds?: number; nanoseconds?: number; toDate?: () => Date };
  tz?: string;
  live?: boolean;              // update automatically
  intervalMs?: number;         // custom update interval (default adaptive)
  showTooltip?: boolean;       // title attribute with absolute time
  className?: string;
}

/**
 * Approach A: Render absolute (SSR) then switch to relative after hydration.
 * - Avoids timezone drift (7h issue) by explicit normalization to Asia/Ho_Chi_Minh by default.
 * - Updates every minute (or custom interval) while live.
 */
const TimeCell: React.FC<TimeCellProps> = ({
  createdAt,
  tz = "Asia/Ho_Chi_Minh",
  live = true,
  intervalMs,
  showTooltip = true,
  className,
}) => {
  const dateObj = normalizeTimestamp(createdAt, tz);
  // On SSR this initializer runs once (absolute). After hydration effect will switch to relative.
  const [label, setLabel] = useState<string>(() => absoluteInTz(dateObj, tz));

  useEffect(() => {
    // Switch immediately to relative on client
    setLabel(formatTimeAgo(dateObj));
    if (!live) return;

    // Adaptive: update more frequently in first hour for accuracy; else per minute
    const diffSec = (Date.now() - dateObj.getTime()) / 1000;
    let baseInterval = intervalMs || (diffSec < 3600 ? 30_000 : 60_000); // 30s < 1h, else 60s
    // Guarantee reasonable bounds
    if (baseInterval < 5_000) baseInterval = 5_000;
    const id = setInterval(() => {
      setLabel(formatTimeAgo(dateObj));
    }, baseInterval);
    return () => clearInterval(id);
  }, [createdAt, intervalMs, live, tz, dateObj]);

  return (
    <span
      className={className}
      title={showTooltip ? absoluteInTz(dateObj, tz) : undefined}
      data-time-iso={dateObj.toISOString()}
    >
      {label}
    </span>
  );
};

export default TimeCell;
