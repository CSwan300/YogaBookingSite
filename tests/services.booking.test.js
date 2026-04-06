// tests/services.booking.test.js
/**
 * Unit tests for services/bookingService.js
 * Covers: bookCourseForUser, bookSessionsForUser, cancelFullBooking, cancelSingleSession
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { resetDb, seedMinimal } from "./helpers.js";
import { closeDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { CourseModel } from "../models/courseModel.js";
import { BookingModel } from "../models/bookingModel.js";
import {
    bookCourseForUser,
    bookSessionsForUser,
    cancelFullBooking,
    cancelSingleSession,
} from "../services/bookingService.js";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let data;
let student;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    student = await UserModel.create({
        name:  "Booking Svc Student",
        email: "bookingsvc@student.local",
        role:  "student",
    });
});

afterAll(async () => {
    await closeDb();
});

// ---------------------------------------------------------------------------
// bookCourseForUser
// ---------------------------------------------------------------------------

describe("bookingService.bookCourseForUser", () => {
    test("creates a COURSE booking in CONFIRMED state when capacity allows", async () => {
        const booking = await bookCourseForUser(student._id, data.course._id);

        expect(booking).toBeDefined();
        expect(booking.type).toBe("COURSE");
        expect(booking.userId).toBe(student._id);
        expect(booking.courseId).toBe(data.course._id);
        expect(["CONFIRMED", "WAITLISTED"]).toContain(booking.status);
    });

    test("booking includes sessionIds array", async () => {
        // Fresh student to avoid duplicate errors
        const s = await UserModel.create({
            name: "Session IDs Student", email: "sessionids@student.local", role: "student",
        });
        const booking = await bookCourseForUser(s._id, data.course._id);
        expect(Array.isArray(booking.sessionIds)).toBe(true);
        expect(booking.sessionIds.length).toBeGreaterThanOrEqual(1);
    });

    test("throws ALREADY_BOOKED when user books the same course twice", async () => {
        const s = await UserModel.create({
            name: "Duplicate Student", email: "duplicate@student.local", role: "student",
        });
        await bookCourseForUser(s._id, data.course._id);

        await expect(bookCourseForUser(s._id, data.course._id)).rejects.toMatchObject({
            message: expect.stringMatching(/already booked/i),
        });
    });

    test("throws when courseId does not exist", async () => {
        await expect(
            bookCourseForUser(student._id, "fake-course-id")
        ).rejects.toThrow("Course not found");
    });

    test("returns WAITLISTED when sessions are at capacity", async () => {
        // Create a course with a capacity-1 session
        const instructor = data.instructor;
        const tinyC = await CourseModel.create({
            title:       "Tiny Capacity Course",
            level:       "beginner",
            type:        "WEEKLY_BLOCK",
            allowDropIn: false,
            startDate:   new Date(Date.now() + 7  * 86400000).toISOString(),
            endDate:     new Date(Date.now() + 30 * 86400000).toISOString(),
            instructorId: instructor._id,
            sessionIds:  [],
        });
        const tinyS = await SessionModel.create({
            courseId:      tinyC._id,
            startDateTime: new Date(Date.now() + 7  * 86400000).toISOString(),
            endDateTime:   new Date(Date.now() + 7  * 86400000 + 3600000).toISOString(),
            capacity:      1,
            bookedCount:   1, // pre-fill to capacity
        });
        await CourseModel.update(tinyC._id, { sessionIds: [tinyS._id] });

        const s = await UserModel.create({
            name: "Waitlist Course Student", email: "wlcourse@student.local", role: "student",
        });
        const booking = await bookCourseForUser(s._id, tinyC._id);
        expect(booking.status).toBe("WAITLISTED");
    });
});

// ---------------------------------------------------------------------------
// bookSessionsForUser
// ---------------------------------------------------------------------------

describe("bookingService.bookSessionsForUser", () => {
    test("creates a SESSION booking for a valid drop-in session", async () => {
        const s = await UserModel.create({
            name: "Session Svc Student", email: "sessionsvc@student.local", role: "student",
        });
        const booking = await bookSessionsForUser(s._id, [data.sessions[0]._id]);

        expect(booking.type).toBe("SESSION");
        expect(["CONFIRMED", "WAITLISTED"]).toContain(booking.status);
    });

    test("throws when sessionIds is empty", async () => {
        await expect(bookSessionsForUser(student._id, [])).rejects.toThrow("No sessions selected");
    });

    test("throws when sessionIds is undefined", async () => {
        await expect(bookSessionsForUser(student._id, undefined)).rejects.toThrow("No sessions selected");
    });

    test("throws when session does not exist", async () => {
        await expect(
            bookSessionsForUser(student._id, ["fake-session-id"])
        ).rejects.toThrow("Session not found");
    });

    test("throws DROPIN_NOT_ALLOWED when course disables drop-ins", async () => {
        const instructor = data.instructor;
        const noDropIn = await CourseModel.create({
            title:        "No Drop-In Course",
            level:        "advanced",
            type:         "WEEKLY_BLOCK",
            allowDropIn:  false,
            startDate:    new Date(Date.now() + 7  * 86400000).toISOString(),
            endDate:      new Date(Date.now() + 60 * 86400000).toISOString(),
            instructorId: instructor._id,
            sessionIds:   [],
        });
        const noDropInSession = await SessionModel.create({
            courseId:      noDropIn._id,
            startDateTime: new Date(Date.now() + 7  * 86400000).toISOString(),
            endDateTime:   new Date(Date.now() + 7  * 86400000 + 3600000).toISOString(),
            capacity:      10,
            bookedCount:   0,
        });

        const s = await UserModel.create({
            name: "No DropIn Student", email: "nodropin@student.local", role: "student",
        });

        await expect(
            bookSessionsForUser(s._id, [noDropInSession._id])
        ).rejects.toMatchObject({ code: "DROPIN_NOT_ALLOWED" });
    });

    test("throws ALREADY_BOOKED when user re-books an already-booked session", async () => {
        const s = await UserModel.create({
            name: "Re-Book Student", email: "rebook@student.local", role: "student",
        });
        await bookSessionsForUser(s._id, [data.sessions[0]._id]);

        await expect(
            bookSessionsForUser(s._id, [data.sessions[0]._id])
        ).rejects.toMatchObject({ code: "ALREADY_BOOKED" });
    });

    test("waitlists when session is at capacity", async () => {
        const instructor = data.instructor;
        const capC = await CourseModel.create({
            title: "Cap Session Course", level: "beginner", type: "WEEKLY_BLOCK",
            allowDropIn: true, instructorId: instructor._id, sessionIds: [],
            startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            endDate:   new Date(Date.now() + 60 * 86400000).toISOString(),
        });
        const capS = await SessionModel.create({
            courseId: capC._id,
            startDateTime: new Date(Date.now() + 7 * 86400000).toISOString(),
            endDateTime:   new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
            capacity: 1,
            bookedCount: 1, // already full
        });

        const s = await UserModel.create({
            name: "Cap Session Student", email: "capsession@student.local", role: "student",
        });
        const booking = await bookSessionsForUser(s._id, [capS._id]);
        expect(booking.status).toBe("WAITLISTED");
    });
});

// ---------------------------------------------------------------------------
// cancelFullBooking
// ---------------------------------------------------------------------------

describe("bookingService.cancelFullBooking", () => {
    test("cancels a booking and sets status to CANCELLED", async () => {
        const s = await UserModel.create({
            name: "Cancel Full Student", email: "cancelfull@student.local", role: "student",
        });
        const booking = await bookSessionsForUser(s._id, [data.sessions[1]._id]);
        const cancelled = await cancelFullBooking(booking._id, s._id);

        expect(cancelled.status).toBe("CANCELLED");
    });

    test("returns the updated booking document", async () => {
        const s = await UserModel.create({
            name: "Cancel Return Student", email: "cancelreturn@student.local", role: "student",
        });
        const booking = await bookCourseForUser(s._id, data.course._id);
        const result  = await cancelFullBooking(booking._id, s._id);

        expect(result._id).toBe(booking._id);
        expect(result.status).toBe("CANCELLED");
    });

    test("throws NOT_FOUND for unknown bookingId", async () => {
        await expect(
            cancelFullBooking("fake-booking-id", student._id)
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    test("throws FORBIDDEN when userId does not match booking owner", async () => {
        const owner = await UserModel.create({
            name: "Owner Student", email: "owner@student.local", role: "student",
        });
        const other = await UserModel.create({
            name: "Other Student", email: "other@student.local", role: "student",
        });
        const booking = await bookSessionsForUser(owner._id, [data.sessions[0]._id]);

        await expect(
            cancelFullBooking(booking._id, other._id)
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    test("is idempotent: cancelling an already-cancelled booking does not throw", async () => {
        const s = await UserModel.create({
            name: "Idempotent Student", email: "idempotent@student.local", role: "student",
        });
        const booking = await bookSessionsForUser(s._id, [data.sessions[0]._id]);
        await cancelFullBooking(booking._id, s._id);

        // Second cancel should not throw — it should return the already-cancelled booking
        const result = await cancelFullBooking(booking._id, s._id);
        expect(result.status).toBe("CANCELLED");
    });

    test("decrements session bookedCount on cancellation", async () => {
        const s = await UserModel.create({
            name: "Decrement Student", email: "decrement@student.local", role: "student",
        });
        const sessionBefore = await SessionModel.findById(data.sessions[0]._id);
        await bookSessionsForUser(s._id, [data.sessions[0]._id]);
        const sessionAfterBook = await SessionModel.findById(data.sessions[0]._id);

        const booking = (await BookingModel.listByUser(s._id))[0];
        await cancelFullBooking(booking._id, s._id);

        const sessionAfterCancel = await SessionModel.findById(data.sessions[0]._id);
        expect(sessionAfterCancel.bookedCount).toBe(sessionAfterBook.bookedCount - 1);
    });
});

// ---------------------------------------------------------------------------
// cancelSingleSession
// ---------------------------------------------------------------------------

describe("bookingService.cancelSingleSession", () => {
    test("removes a single session from a booking", async () => {
        const s = await UserModel.create({
            name: "Single Cancel Student", email: "singlecancel@student.local", role: "student",
        });
        const booking = await bookCourseForUser(s._id, data.course._id);

        const result = await cancelSingleSession(
            booking._id,
            booking.sessionIds[0],
            s._id
        );
        expect(result).toBe(booking._id);
    });

    test("throws NOT_FOUND for unknown bookingId", async () => {
        await expect(
            cancelSingleSession("fake-id", data.sessions[0]._id, student._id)
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    test("throws FORBIDDEN when userId does not match booking owner", async () => {
        const owner = await UserModel.create({
            name: "SC Owner", email: "scowner@student.local", role: "student",
        });
        const other = await UserModel.create({
            name: "SC Other", email: "scother@student.local", role: "student",
        });
        const booking = await bookCourseForUser(owner._id, data.course._id);

        await expect(
            cancelSingleSession(booking._id, booking.sessionIds[0], other._id)
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
});
