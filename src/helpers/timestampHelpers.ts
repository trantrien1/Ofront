import moment from "moment";
import { Timestamp } from "firebase/firestore";

/**
 * Convert Firestore timestamp to ISO string for consistent server-client rendering
 */
export const timestampToISO = (timestamp: Timestamp | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  
  // Convert Firestore timestamp to ISO string
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString();
};

/**
 * Format ISO timestamp string to relative time (e.g., "5 minutes ago")
 * This should only be called on client-side to prevent hydration mismatch
 */
export const formatTimeAgo = (isoString: string): string => {
  if (!isoString) return "Just now";
  
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
    return timestamp;
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
