/**
 * @file seed/seed.js
 * @description
 * Seed script that wipes the database and populates it with
 * demo users, courses, sessions, and bookings for future dates.
 */

import {
    initDb,
    usersDb,
    coursesDb,
    sessionsDb,
    bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import { BookingModel } from "../models/bookingModel.js";

import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

const iso      = (d) => new Date(d).toISOString();
const addHours = (date, h) => new Date(date.getTime() + h * 60 * 60 * 1000);
const addDays  = (date, d) => new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
const addWeeks = (date, w) => addDays(date, w * 7);
const addMins  = (date, m) => new Date(date.getTime() + m * 60 * 1000);

/* ── Wipe ───────────────────────────────────────────────────── */
async function wipeAll() {
    await Promise.all([
        usersDb.remove({}, { multi: true }),
        coursesDb.remove({}, { multi: true }),
        sessionsDb.remove({}, { multi: true }),
        bookingsDb.remove({}, { multi: true }),
    ]);

    await Promise.all([
        usersDb.compactDatafile(),
        coursesDb.compactDatafile(),
        sessionsDb.compactDatafile(),
        bookingsDb.compactDatafile(),
    ]);
}

/* ── Helpers ────────────────────────────────────────────────── */
async function buildSessions(courseId, slots) {
    const sessions = [];
    for (const slot of slots) {
        const s = await SessionModel.create({
            courseId,
            startDateTime: iso(slot.start),
            endDateTime:   iso(addMins(slot.start, slot.durationMins)),
            capacity:      slot.capacity,
            bookedCount:   slot.bookedCount ?? 0,
        });
        sessions.push(s);
    }
    await CourseModel.update(courseId, { sessionIds: sessions.map((s) => s._id) });
    return sessions;
}

/* ── Users ──────────────────────────────────────────────────── */
async function createUsers() {
    const [admin, ...otherUsers] = await Promise.all([
        UserModel.create({
            name: "Admin",
            email: "admin@yoga.local",
            role: "organiser",
            passwordHash: await hashPassword("admin1234"),
        }),
        UserModel.create({
            name: "Fiona",
            email: "fiona@student.local",
            role: "student",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=fiona",
        }),
        UserModel.create({
            name: "Marcus",
            email: "marcus@student.local",
            role: "student",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=marcus",
        }),
        UserModel.create({
            name: "Priya",
            email: "priya@student.local",
            role: "student",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=priya",
        }),
        UserModel.create({
            name: "Lena",
            email: "lena@student.local",
            role: "student",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=lena",
        }),
        UserModel.create({
            name: "Tom",
            email: "tom@student.local",
            role: "student",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=tom",
        }),
        UserModel.create({
            name: "Ava",
            email: "ava@yoga.local",
            role: "instructor",
            passwordHash: await hashPassword("instructor123"),
            bio: "Restorative specialist.",
            image: "https://i.pravatar.cc/150?u=ava",
        }),
        UserModel.create({
            name: "Ben",
            email: "ben@yoga.local",
            role: "instructor",
            passwordHash: await hashPassword("instructor123"),
            bio: "Vinyasa energy.",
            image: "https://i.pravatar.cc/150?u=ben",
        }),
        UserModel.create({
            name: "Chen",
            email: "chen@yoga.local",
            role: "instructor",
            passwordHash: await hashPassword("instructor123"),
            bio: "Strength & Inversions.",
            image: "https://i.pravatar.cc/150?u=chen",
        }),
        UserModel.create({
            name: "Isla",
            email: "isla@yoga.local",
            role: "instructor",
            passwordHash: await hashPassword("instructor123"),
            bio: "Gentle Hatha.",
            image: "https://i.pravatar.cc/150?u=isla",
        }),
        UserModel.create({
            name: "Raj",
            email: "raj@yoga.local",
            role: "instructor",
            passwordHash: await hashPassword("instructor123"),
            bio: "Power & Ashtanga.",
            image: "https://i.pravatar.cc/150?u=raj",
        }),
    ]);

    return {
        organiser:   admin,
        students:    [otherUsers[0], otherUsers[1], otherUsers[2], otherUsers[3], otherUsers[4]],
        instructors: {
            ava: otherUsers[5],
            ben: otherUsers[6],
            chen: otherUsers[7],
            isla: otherUsers[8],
            raj: otherUsers[9],
        },
    };
}

/* ── Courses (Future Dated) ─────────────────────────────────── */

// 1. May 2026 - Weekend Workshop
async function createWinterMindfulness(instructorId) {
    const course = await CourseModel.create({
        title: "Spring Mindfulness Workshop", level: "beginner", type: "WEEKEND_WORKSHOP",
        allowDropIn: false, startDate: "2026-05-16", endDate: "2026-05-17",
        instructorId, location: "Studio A", price: 85, description: "Mindfulness for the new season."
    });
    const base = new Date("2026-05-16T10:00:00");
    const sessions = await buildSessions(course._id, [
        { start: base, durationMins: 60, capacity: 20, bookedCount: 5 },
        { start: addHours(base, 2), durationMins: 60, capacity: 20, bookedCount: 5 },
        { start: addDays(base, 1), durationMins: 60, capacity: 20, bookedCount: 5 }
    ]);
    return { course, sessions };
}

// 2. June 2026 - Weekly Block
async function createVinyasaFlow(instructorId) {
    const course = await CourseModel.create({
        title: "Summer Vinyasa Flow", level: "intermediate", type: "WEEKLY_BLOCK",
        allowDropIn: true, startDate: "2026-06-01", endDate: "2026-07-20",
        instructorId, location: "Studio B", price: 180, dropInPrice: 18
    });
    const first = new Date("2026-06-01T18:30:00");
    const slots = Array.from({ length: 8 }, (_, i) => ({ start: addWeeks(first, i), durationMins: 75, capacity: 15, bookedCount: 2 }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 3. July 2026 - Power Yoga
async function createPowerYoga(instructorId) {
    const course = await CourseModel.create({
        title: "Summer Power Challenge", level: "advanced", type: "WEEKLY_BLOCK",
        allowDropIn: false, startDate: "2026-07-05", endDate: "2026-08-09",
        instructorId, location: "Studio B", price: 120, description: "High intensity for summer."
    });
    const first = new Date("2026-07-05T19:00:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({ start: addWeeks(first, i), durationMins: 60, capacity: 12, bookedCount: 4 }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

/* ── Bookings ───────────────────────────────────────────────── */
async function createBookings(students, courses) {
    const [fiona, marcus, priya] = students;
    const { c1, c2, c3 } = courses;

    await Promise.all([
        // Fiona - Full Course Booking
        BookingModel.create({
            userId: fiona._id, courseId: c1.course._id, type: "COURSE", status: "CONFIRMED",
            sessionIds: c1.sessions.map(s => s._id), createdAt: iso(new Date())
        }),
        // Marcus - Drop-in Session 1
        BookingModel.create({
            userId: marcus._id, courseId: c2.course._id, type: "SESSION", status: "CONFIRMED",
            sessionIds: [c2.sessions[0]._id], createdAt: iso(new Date())
        }),
        // Priya - Full Course Booking
        BookingModel.create({
            userId: priya._id, courseId: c3.course._id, type: "COURSE", status: "CONFIRMED",
            sessionIds: c3.sessions.map(s => s._id), createdAt: iso(new Date())
        })
    ]);
}

/* ── Run ────────────────────────────────────────────────────── */
async function run() {
    console.log("Starting Future-Dated Seed...");
    await initDb();
    await wipeAll();

    const { organiser, students, instructors } = await createUsers();

    const c1 = await createWinterMindfulness(instructors.ava._id);
    const c2 = await createVinyasaFlow(instructors.ben._id);
    const c3 = await createPowerYoga(instructors.raj._id);

    await createBookings(students, { c1, c2, c3 });

    console.log("✅ Seed complete. All courses set for May 2026 and beyond.");
    // force it to exit
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});