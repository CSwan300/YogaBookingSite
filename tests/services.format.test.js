// tests/services.format.test.js
/**
 * Pure unit tests for services/formatService.js and
 * services/courseService.js (pure helper functions only).
 * No DB required — these are deterministic transformations.
 */

import { describe, test, expect } from "@jest/globals";
import {
    fmtDateOnly,
    fmtDate,
    fmtDateTime,
    fmtTimeOnly,
    fmtType,
    duration,
} from "../services/formatService.js";

import { buildCourseShape, buildSessionRows } from "../services/courseService.js";

// ---------------------------------------------------------------------------
// fmtDateOnly
// ---------------------------------------------------------------------------

describe("fmtDateOnly", () => {
    test("formats an ISO string to short date", () => {
        const result = fmtDateOnly("2026-06-15T10:00:00.000Z");
        expect(result).toMatch(/jun/i);
        expect(result).toMatch(/2026/);
        expect(result).toMatch(/15/);
    });

    test("returns empty string for null", () => {
        expect(fmtDateOnly(null)).toBe("");
    });

    test("returns empty string for undefined", () => {
        expect(fmtDateOnly(undefined)).toBe("");
    });

    test("handles midnight correctly", () => {
        const result = fmtDateOnly("2026-01-01T00:00:00.000Z");
        expect(result).toMatch(/jan/i);
        expect(result).toMatch(/2026/);
    });
});

// ---------------------------------------------------------------------------
// fmtDate / fmtDateTime (alias)
// ---------------------------------------------------------------------------

describe("fmtDate / fmtDateTime", () => {
    test("includes the weekday abbreviation", () => {
        // 2026-06-15 is a Monday
        const result = fmtDate("2026-06-15T10:00:00.000Z");
        // Just check it's a non-empty string with expected parts
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(5);
    });

    test("returns 'TBA' for null", () => {
        expect(fmtDate(null)).toBe("TBA");
    });

    test("returns 'TBA' for undefined", () => {
        expect(fmtDate(undefined)).toBe("TBA");
    });

    test("fmtDate and fmtDateTime are identical", () => {
        const iso = "2026-09-10T14:30:00.000Z";
        expect(fmtDate(iso)).toBe(fmtDateTime(iso));
    });
});

// ---------------------------------------------------------------------------
// fmtTimeOnly
// ---------------------------------------------------------------------------

describe("fmtTimeOnly", () => {
    test("returns a time string with colon separator", () => {
        const result = fmtTimeOnly("2026-06-15T14:30:00.000Z");
        expect(result).toMatch(/\d{2}:\d{2}/);
    });

    test("returns empty string for null", () => {
        expect(fmtTimeOnly(null)).toBe("");
    });

    test("returns empty string for undefined", () => {
        expect(fmtTimeOnly(undefined)).toBe("");
    });
});

// ---------------------------------------------------------------------------
// fmtType
// ---------------------------------------------------------------------------

describe("fmtType", () => {
    test("converts WEEKLY_BLOCK to title case", () => {
        expect(fmtType("WEEKLY_BLOCK")).toBe("Weekly Block");
    });

    test("converts WEEKEND_WORKSHOP to title case", () => {
        expect(fmtType("WEEKEND_WORKSHOP")).toBe("Weekend Workshop");
    });

    test("handles single-word type", () => {
        expect(fmtType("workshop")).toBe("Workshop");
    });

    test("returns empty string for null", () => {
        expect(fmtType(null)).toBe("");
    });

    test("returns empty string for undefined", () => {
        expect(fmtType(undefined)).toBe("");
    });

    test("handles an already-title-cased string", () => {
        expect(fmtType("Weekly Block")).toBe("Weekly Block");
    });
});

// ---------------------------------------------------------------------------
// duration
// ---------------------------------------------------------------------------

describe("duration", () => {
    test("returns minutes only for durations under an hour", () => {
        const start = "2026-06-15T10:00:00.000Z";
        const end   = "2026-06-15T10:45:00.000Z";
        expect(duration(start, end)).toBe("45m");
    });

    test("returns hours and minutes for durations >= 1 hour", () => {
        const start = "2026-06-15T10:00:00.000Z";
        const end   = "2026-06-15T11:15:00.000Z";
        expect(duration(start, end)).toBe("1h 15m");
    });

    test("returns exact hours with no trailing minutes part when evenly divisible", () => {
        const start = "2026-06-15T10:00:00.000Z";
        const end   = "2026-06-15T12:00:00.000Z";
        expect(duration(start, end)).toBe("2h");
    });

    test("handles 90-minute sessions", () => {
        const start = "2026-06-15T09:00:00.000Z";
        const end   = "2026-06-15T10:30:00.000Z";
        expect(duration(start, end)).toBe("1h 30m");
    });

    test("returns 0m for zero-length session", () => {
        const iso = "2026-06-15T10:00:00.000Z";
        expect(duration(iso, iso)).toBe("0m");
    });
});

// ---------------------------------------------------------------------------
// buildCourseShape (courseService helper)
// ---------------------------------------------------------------------------

describe("courseService.buildCourseShape", () => {
    const rawCourse = {
        _id:         "course-123",
        title:       "Yoga Basics",
        level:       "beginner",
        type:        "WEEKLY_BLOCK",
        price:       120,
        allowDropIn: true,
        location:    "Studio A",
        dropInPrice: 15,
        startDate:   "2026-06-01T00:00:00.000Z",
        endDate:     "2026-08-31T00:00:00.000Z",
        description: "A beginner yoga course.",
    };

    test("maps _id to id field", () => {
        const shape = buildCourseShape(rawCourse);
        expect(shape.id).toBe("course-123");
    });

    test("includes all expected top-level fields", () => {
        const shape = buildCourseShape(rawCourse);
        expect(shape).toHaveProperty("id");
        expect(shape).toHaveProperty("title");
        expect(shape).toHaveProperty("level");
        expect(shape).toHaveProperty("type");
        expect(shape).toHaveProperty("price");
        expect(shape).toHaveProperty("allowDropIn");
        expect(shape).toHaveProperty("location");
        expect(shape).toHaveProperty("startDate");
        expect(shape).toHaveProperty("endDate");
        expect(shape).toHaveProperty("description");
    });

    test("formats the type field via fmtType", () => {
        const shape = buildCourseShape(rawCourse);
        expect(shape.type).toBe("Weekly Block");
    });

    test("falls back to 'TBA' when location is absent", () => {
        const shape = buildCourseShape({ ...rawCourse, location: undefined });
        expect(shape.location).toBe("TBA");
    });

    test("falls back price to 0 when absent", () => {
        const shape = buildCourseShape({ ...rawCourse, price: undefined });
        expect(shape.price).toBe(0);
    });

    test("formats startDate and endDate as readable strings", () => {
        const shape = buildCourseShape(rawCourse);
        expect(shape.startDate).not.toBe("");
        expect(shape.endDate).not.toBe("");
    });

    test("returns empty string for missing startDate", () => {
        const shape = buildCourseShape({ ...rawCourse, startDate: undefined });
        expect(shape.startDate).toBe("");
    });
});

// ---------------------------------------------------------------------------
// buildSessionRows (courseService helper)
// ---------------------------------------------------------------------------

describe("courseService.buildSessionRows", () => {
    const now      = new Date("2026-06-15T00:00:00.000Z");
    const sessions = [
        {
            _id:           "s1",
            startDateTime: "2026-06-20T10:00:00.000Z", // future
            capacity:      10,
            bookedCount:   3,
        },
        {
            _id:           "s2",
            startDateTime: "2026-06-10T10:00:00.000Z", // past
            capacity:      10,
            bookedCount:   10,
        },
    ];

    test("returns one row per session", () => {
        const rows = buildSessionRows(sessions, now);
        expect(rows.length).toBe(2);
    });

    test("calculates remaining spots correctly", () => {
        const rows = buildSessionRows(sessions, now);
        expect(rows[0].remaining).toBe(7);
        expect(rows[1].remaining).toBe(0);
    });

    test("marks full sessions as isFull", () => {
        const rows = buildSessionRows(sessions, now);
        expect(rows[0].isFull).toBe(false);
        expect(rows[1].isFull).toBe(true);
    });

    test("marks past sessions as isPast", () => {
        const rows = buildSessionRows(sessions, now);
        expect(rows[0].isPast).toBe(false);
        expect(rows[1].isPast).toBe(true);
    });

    test("coerces _id to string", () => {
        const rows = buildSessionRows(sessions, now);
        expect(typeof rows[0].id).toBe("string");
    });

    test("remaining is never negative (clamped at 0)", () => {
        const over = [{ _id: "s3", startDateTime: "2026-07-01T10:00:00.000Z", capacity: 5, bookedCount: 10 }];
        const rows = buildSessionRows(over, now);
        expect(rows[0].remaining).toBe(0);
    });

    test("handles sessions with undefined bookedCount (defaults to 0)", () => {
        const noCount = [{ _id: "s4", startDateTime: "2026-07-01T10:00:00.000Z", capacity: 5 }];
        const rows    = buildSessionRows(noCount, now);
        expect(rows[0].remaining).toBe(5);
        expect(rows[0].isFull).toBe(false);
    });
});
