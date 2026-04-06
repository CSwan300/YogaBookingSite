// tests/services.organiser.test.js
/**
 * Unit tests for services/organiserService.js
 * Covers: dashboard data fetching, course CRUD, user/instructor/organiser management,
 * class list data, and the classes dashboard page data functions.
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { resetDb, seedMinimal } from "./helpers.js";
import { closeDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

import {
    getAdminDashboardData,
    getCoursesDashboardData,
    createCourse,
    deleteCourse,
    updateCourse,
    getClassesDashboardData,
    getClassesDashboardPageData,
    getClassListData,
    getOrganisersData,
    createOrganiser,
    deleteOrganiser,
    getUsersData,
    deleteUser,
    getInstructorsData,
    createInstructor,
    deleteInstructor,
} from "../services/organiserService.js";

let data;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
});

afterAll(async () => {
    await closeDb();
});

// ---------------------------------------------------------------------------
// getAdminDashboardData
// ---------------------------------------------------------------------------

describe("organiserService.getAdminDashboardData", () => {
    test("returns courseCount, userCount, bookingCount", async () => {
        const result = await getAdminDashboardData();
        expect(result).toHaveProperty("courseCount");
        expect(result).toHaveProperty("userCount");
        expect(result).toHaveProperty("bookingCount");
    });

    test("counts are non-negative integers", async () => {
        const { courseCount, userCount, bookingCount } = await getAdminDashboardData();
        expect(courseCount).toBeGreaterThanOrEqual(0);
        expect(userCount).toBeGreaterThanOrEqual(0);
        expect(bookingCount).toBeGreaterThanOrEqual(0);
    });

    test("reflects at least the seeded course", async () => {
        const { courseCount } = await getAdminDashboardData();
        expect(courseCount).toBeGreaterThanOrEqual(1);
    });

    test("does not count CANCELLED bookings in bookingCount", async () => {
        // Create and cancel a booking
        const student = await UserModel.create({
            name: "Dashboard Test Student", email: "dashtest@student.local", role: "student",
        });
        const booking = await BookingModel.create({
            userId: student._id, courseId: data.course._id, type: "SESSION",
            sessionIds: [data.sessions[0]._id], status: "CONFIRMED",
        });
        const before = (await getAdminDashboardData()).bookingCount;

        await BookingModel.cancel(booking._id);
        const after = (await getAdminDashboardData()).bookingCount;
        expect(after).toBe(before - 1);
    });
});

// ---------------------------------------------------------------------------
// getCoursesDashboardData
// ---------------------------------------------------------------------------

describe("organiserService.getCoursesDashboardData", () => {
    test("returns courses and instructors arrays", async () => {
        const { courses, instructors } = await getCoursesDashboardData();
        expect(Array.isArray(courses)).toBe(true);
        expect(Array.isArray(instructors)).toBe(true);
    });

    test("instructors only contain users with role=instructor", async () => {
        const { instructors } = await getCoursesDashboardData();
        instructors.forEach((i) => expect(i.role).toBe("instructor"));
    });

    test("courses array contains the seeded course", async () => {
        const { courses } = await getCoursesDashboardData();
        const titles = courses.map((c) => c.title);
        expect(titles).toContain("Test Course");
    });
});

// ---------------------------------------------------------------------------
// createCourse / updateCourse / deleteCourse
// ---------------------------------------------------------------------------

describe("organiserService course CRUD", () => {
    test("createCourse persists a new course", async () => {
        const course = await createCourse({
            title: "Organiser Created Course",
            level: "intermediate",
            type:  "WEEKLY_BLOCK",
            allowDropIn: false,
            startDate: new Date(Date.now() + 7  * 86400000).toISOString(),
            endDate:   new Date(Date.now() + 60 * 86400000).toISOString(),
            instructorId: data.instructor._id,
        });
        expect(course._id).toBeDefined();
        expect(course.title).toBe("Organiser Created Course");
    });

    test("updateCourse modifies an existing course", async () => {
        const course  = await createCourse({
            title: "To Be Updated", level: "beginner", type: "WEEKLY_BLOCK",
            allowDropIn: false, instructorId: data.instructor._id,
            startDate: new Date(Date.now() + 7  * 86400000).toISOString(),
            endDate:   new Date(Date.now() + 60 * 86400000).toISOString(),
        });
        await updateCourse(course._id, { title: "Updated Title" });
        const { courses } = await getCoursesDashboardData();
        const updated = courses.find((c) => c._id === course._id);
        expect(updated?.title).toBe("Updated Title");
    });

    test("deleteCourse removes it from the list", async () => {
        const course = await createCourse({
            title: "To Be Deleted", level: "beginner", type: "WEEKLY_BLOCK",
            allowDropIn: false, instructorId: data.instructor._id,
            startDate: new Date(Date.now() + 7  * 86400000).toISOString(),
            endDate:   new Date(Date.now() + 60 * 86400000).toISOString(),
        });
        await deleteCourse(course._id);
        const { courses } = await getCoursesDashboardData();
        expect(courses.some((c) => c._id === course._id)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getClassesDashboardData
// ---------------------------------------------------------------------------

describe("organiserService.getClassesDashboardData", () => {
    test("returns sessions array", async () => {
        const { sessions } = await getClassesDashboardData();
        expect(Array.isArray(sessions)).toBe(true);
    });

    test("each session has required enriched fields", async () => {
        const { sessions } = await getClassesDashboardData();
        if (sessions.length > 0) {
            const s = sessions[0];
            expect(s).toHaveProperty("id");
            expect(s).toHaveProperty("courseTitle");
            expect(s).toHaveProperty("courseLevel");
            expect(s).toHaveProperty("start");
            expect(s).toHaveProperty("capacity");
            expect(s).toHaveProperty("bookedCount");
        }
    });

    test("filterCourse narrows results to matching title", async () => {
        const { sessions } = await getClassesDashboardData("Test Course");
        sessions.forEach((s) => {
            expect(s.courseTitle).toBe("Test Course");
        });
    });

    test("filterCourse with unknown title returns empty array", async () => {
        const { sessions } = await getClassesDashboardData("Absolutely Not A Course");
        expect(sessions).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// getClassesDashboardPageData
// ---------------------------------------------------------------------------

describe("organiserService.getClassesDashboardPageData", () => {
    test("returns sessions, uniqueCourses, and selectedCourse", async () => {
        const result = await getClassesDashboardPageData();
        expect(result).toHaveProperty("sessions");
        expect(result).toHaveProperty("uniqueCourses");
        expect(result).toHaveProperty("selectedCourse");
    });

    test("uniqueCourses contains only distinct course titles", async () => {
        const { uniqueCourses } = await getClassesDashboardPageData();
        const unique = [...new Set(uniqueCourses)];
        expect(uniqueCourses.length).toBe(unique.length);
    });

    test("selectedCourse is null when no filter provided", async () => {
        const { selectedCourse } = await getClassesDashboardPageData(null);
        expect(selectedCourse).toBeNull();
    });

    test("selectedCourse reflects the passed filter", async () => {
        const { selectedCourse } = await getClassesDashboardPageData("Test Course");
        expect(selectedCourse).toBe("Test Course");
    });
});

// ---------------------------------------------------------------------------
// getClassListData
// ---------------------------------------------------------------------------

describe("organiserService.getClassListData", () => {
    test("resolves by course id and returns course title and sessions", async () => {
        const result = await getClassListData(data.course._id);
        expect(result.course.title).toBe("Test Course");
        expect(Array.isArray(result.sessions)).toBe(true);
    });

    test("each session has start, participants, and count", async () => {
        const { sessions } = await getClassListData(data.course._id);
        sessions.forEach((s) => {
            expect(s).toHaveProperty("start");
            expect(s).toHaveProperty("participants");
            expect(s).toHaveProperty("count");
        });
    });

    test("resolves by session id and returns correct course", async () => {
        const result = await getClassListData(data.sessions[0]._id);
        expect(result.course.title).toBe("Test Course");
    });

    test("throws when id does not resolve to any course or session", async () => {
        await expect(getClassListData("fake-id")).rejects.toThrow();
    });

    test("throws when no id is provided", async () => {
        await expect(getClassListData(null)).rejects.toThrow("No ID provided");
    });

    test("participants are deduplicated by email", async () => {
        // Book the same student on both a SESSION and COURSE booking for the same session
        const student = await UserModel.create({
            name: "Dedup Student", email: "dedup@student.local", role: "student",
        });
        await BookingModel.create({
            userId: student._id, courseId: data.course._id, type: "SESSION",
            sessionIds: [data.sessions[0]._id], status: "CONFIRMED",
        });
        await BookingModel.create({
            userId: student._id, courseId: data.course._id, type: "COURSE",
            sessionIds: [data.sessions[0]._id], status: "CONFIRMED",
        });

        const { sessions } = await getClassListData(data.course._id);
        const targetSession = sessions.find((s) =>
            // sessions are sorted newest-first
            s.participants.some((p) => p.email === "dedup@student.local")
        );

        if (targetSession) {
            const emails = targetSession.participants.map((p) => p.email);
            const unique  = [...new Set(emails)];
            expect(emails.length).toBe(unique.length);
        }
    });
});

// ---------------------------------------------------------------------------
// Organisers CRUD
// ---------------------------------------------------------------------------

describe("organiserService — organisers", () => {
    test("getOrganisersData returns only organisers", async () => {
        const { organisers } = await getOrganisersData();
        organisers.forEach((o) => expect(o.role).toBe("organiser"));
    });

    test("createOrganiser adds a user with role=organiser", async () => {
        await createOrganiser({ name: "New Org", email: "neworg@studio.local" });
        const { organisers } = await getOrganisersData();
        expect(organisers.some((o) => o.email === "neworg@studio.local")).toBe(true);
    });

    test("deleteOrganiser removes the organiser", async () => {
        const org = await createOrganiser({ name: "Delete Org", email: "deleteorg@studio.local" });
        await deleteOrganiser(org._id);
        const { organisers } = await getOrganisersData();
        expect(organisers.some((o) => o._id === org._id)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Instructors CRUD
// ---------------------------------------------------------------------------

describe("organiserService — instructors", () => {
    test("getInstructorsData returns only instructors", async () => {
        const { instructors } = await getInstructorsData();
        instructors.forEach((i) => expect(i.role).toBe("instructor"));
    });

    test("createInstructor adds a user with role=instructor", async () => {
        await createInstructor({ name: "New Instructor", email: "newinstructor@studio.local" });
        const { instructors } = await getInstructorsData();
        expect(instructors.some((i) => i.email === "newinstructor@studio.local")).toBe(true);
    });

    test("deleteInstructor removes the instructor", async () => {
        const instr = await createInstructor({ name: "Del Instructor", email: "delinstructor@studio.local" });
        await deleteInstructor(instr._id);
        const { instructors } = await getInstructorsData();
        expect(instructors.some((i) => i._id === instr._id)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Users CRUD
// ---------------------------------------------------------------------------

describe("organiserService — users (students)", () => {
    test("getUsersData returns only students and legacy users", async () => {
        const { users } = await getUsersData();
        users.forEach((u) => expect(["student", "user"]).toContain(u.role));
    });

    test("deleteUser removes the student", async () => {
        const student = await UserModel.create({
            name: "Delete Me", email: "deleteme@student.local", role: "student",
        });
        await deleteUser(student._id);
        const { users } = await getUsersData();
        expect(users.some((u) => u._id === student._id)).toBe(false);
    });
});
