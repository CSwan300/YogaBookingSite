// services/formatService.js
// Pure formatting helpers used across controllers and services.
// No DB calls — safe to import anywhere without side effects.

/**
 * Formats an ISO date string to a short date-only string.
 * e.g. "12 Apr 2025"
 *
 * @param {string|null} iso - ISO date string
 * @returns {string}
 */
export const fmtDateOnly = (iso) =>
    iso
        ? new Date(iso).toLocaleDateString("en-GB", {
            year:  "numeric",
            month: "short",
            day:   "numeric",
        })
        : "";

/**
 * Formats an ISO date string to a full date + time string.
 * e.g. "Sat, 12 Apr 2025, 10:00"
 *
 * @param {string|null} iso - ISO date string
 * @returns {string}
 */
export const fmtDateTime = (iso) =>
    iso
        ? new Date(iso).toLocaleString("en-GB", {
            weekday: "short",
            year:    "numeric",
            month:   "short",
            day:     "numeric",
            hour:    "2-digit",
            minute:  "2-digit",
        })
        : "TBA";

/**
 * Alias of fmtDateTime — used widely as `fmtDate` in view controllers.
 *
 * @param {string|null} iso - ISO date string
 * @returns {string}
 */
export const fmtDate = fmtDateTime;

/**
 * Formats an ISO date string to a time-only string.
 * e.g. "10:00"
 *
 * @param {string|null} iso - ISO date string
 * @returns {string}
 */
export const fmtTimeOnly = (iso) =>
    iso
        ? new Date(iso).toLocaleTimeString("en-GB", {
            hour:   "2-digit",
            minute: "2-digit",
        })
        : "";

/**
 * Converts a raw course type string into a human-readable label.
 * e.g. "WEEKLY_BLOCK" → "Weekly Block"
 *
 * @param {string|null} raw - Raw type string from the DB
 * @returns {string}
 */
export const fmtType = (raw) =>
    (raw ?? "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Calculates the human-readable duration between two ISO date strings.
 * e.g. "1h 30m" or "45m"
 *
 * @param {string} start - ISO start date string
 * @param {string} end   - ISO end date string
 * @returns {string}
 */
export const duration = (start, end) => {
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60 ? mins % 60 + "m" : ""}`.trim()
        : `${mins}m`;
};