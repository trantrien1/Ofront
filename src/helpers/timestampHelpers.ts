import moment from "moment";
type Timestamp = any;

/**
 * Convert Firestore timestamp to ISO string for consistent server-client rendering
 */
export const timestampToISO = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  
  // Convert Firestore timestamp to ISO string
  const date = timestamp.toDate();
  return date.toISOString();
};

/**
 * Format ISO timestamp string to relative time (e.g., "5 minutes ago")
 * This should only be called on client-side to prevent hydration mismatch
 */
export const formatTimeAgo = (isoString: string): string => {
  if (!isoString) return "Just now";
  
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    // On server side, return a static format to prevent hydration mismatch
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString();
    } catch (error) {
      return "Just now";
    }
  }
  
  try {
    return moment(isoString).fromNow();
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "Just now";
  }
};

/**
 * Get current timestamp as ISO string for consistent storage
 */
export const getCurrentTimestampISO = (): string => {
  return new Date().toISOString();
};

/**
 * Convert any timestamp format to ISO string
 */
export const normalizeTimestamp = (timestamp: any): string => {
  if (!timestamp) return getCurrentTimestampISO();
  
  // If it's already a string, assume it's ISO
  if (typeof timestamp === 'string') {
    const s = timestamp.trim();
    // If string has no timezone info (no 'Z' and no +/- offset), treat as UTC by appending 'Z'
    const hasTZ = /Z$/i.test(s) || /[\+\-]\d{2}:?\d{2}$/.test(s);
    if (hasTZ) return s;
    // If there's no timezone, interpret as LOCAL time (not UTC) to avoid offset drift
    // Accept variable-length fractional seconds by trimming to milliseconds precision
    if (/^\d{4}-\d{2}-\d{2}([T\s]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/.test(s)) {
      try {
        const trimmed = s.replace(/(\.\d{3})\d+$/, '$1');
        return new Date(trimmed).toISOString();
      } catch { return s; }
    }
    return s;
  }
  
  // If it's a Firestore timestamp
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  
  // If it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it's a number (Unix timestamp)
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  }
  
  // If it has seconds property (Firestore timestamp format)
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  
  return getCurrentTimestampISO();
};
