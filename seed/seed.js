/**
 * @file seed/seed.js
 * @description
 * Seed script that wipes the database and populates it with
 * demo users, courses, and sessions for future dates.
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
            bookedCount:   0,
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
            role: "user",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=fiona",
        }),
        UserModel.create({
            name: "Marcus",
            email: "marcus@student.local",
            role: "user",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=marcus",
        }),
        UserModel.create({
            name: "Priya",
            email: "priya@student.local",
            role: "user",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=priya",
        }),
        UserModel.create({
            name: "Lena",
            email: "lena@student.local",
            role: "user",
            passwordHash: await hashPassword("password123"),
            image: "https://i.pravatar.cc/150?u=lena",
        }),
        UserModel.create({
            name: "Tom",
            email: "tom@student.local",
            role: "user",
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
        users:    [otherUsers[0], otherUsers[1], otherUsers[2], otherUsers[3], otherUsers[4]],
        instructors: {
            ava:  otherUsers[5],
            ben:  otherUsers[6],
            chen: otherUsers[7],
            isla: otherUsers[8],
            raj:  otherUsers[9],
        },
    };
}

/* ── Courses ────────────────────────────────────────────────── */

// 1. May 2026 - Weekend Workshop (beginner, Ava)
async function createSpringMindfulness(instructorId) {
    const course = await CourseModel.create({
        title: "Spring Mindfulness Workshop", level: "beginner", type: "WEEKEND_WORKSHOP",
        allowDropIn: false, startDate: "2026-05-16", endDate: "2026-05-17",
        instructorId, location: "Studio A", price: 85,
        description: "A two-day deep dive into mindful movement and breathwork to welcome the new season."
    });
    const base = new Date("2026-05-16T10:00:00");
    const sessions = await buildSessions(course._id, [
        { start: base,              durationMins: 60, capacity: 20 },
        { start: addHours(base, 2), durationMins: 60, capacity: 20 },
        { start: addDays(base, 1),  durationMins: 60, capacity: 20 },
    ]);
    return { course, sessions };
}

// 2. June–July 2026 - Weekly Block (intermediate, Ben, drop-in allowed)
async function createVinyasaFlow(instructorId) {
    const course = await CourseModel.create({
        title: "Summer Vinyasa Flow", level: "intermediate", type: "WEEKLY_BLOCK",
        allowDropIn: true, startDate: "2026-06-01", endDate: "2026-07-20",
        instructorId, location: "Studio B", price: 180, dropInPrice: 18,
        description: "Eight weeks of flowing sequences to build strength, flexibility, and breath awareness."
    });
    const first = new Date("2026-06-01T18:30:00");
    const slots = Array.from({ length: 8 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 75, capacity: 15,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 3. July–Aug 2026 - Weekly Block (advanced, Raj)
async function createPowerYoga(instructorId) {
    const course = await CourseModel.create({
        title: "Summer Power Challenge", level: "advanced", type: "WEEKLY_BLOCK",
        allowDropIn: false, startDate: "2026-07-05", endDate: "2026-08-09",
        instructorId, location: "Studio B", price: 120,
        description: "Six weeks of high-intensity Ashtanga-inspired sequences designed to push your edge."
    });
    const first = new Date("2026-07-05T19:00:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 60, capacity: 12,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 4. May 2026 - Single one-off drop-in class (beginner, Isla)
async function createHathaIntro(instructorId) {
    const course = await CourseModel.create({
        title: "Intro to Hatha Yoga", level: "beginner", type: "ONE_OFF",
        allowDropIn: true, startDate: "2026-05-08", endDate: "2026-05-08",
        instructorId, location: "Studio C", price: 12, dropInPrice: 12,
        description: "A relaxed, welcoming introduction to Hatha postures — perfect if you have never tried yoga before."
    });
    const sessions = await buildSessions(course._id, [
        { start: new Date("2026-05-08T09:30:00"), durationMins: 60, capacity: 25 },
    ]);
    return { course, sessions };
}

// 5. May–Jun 2026 - Weekly Block (beginner, Isla, drop-in allowed)
async function createGentleHatha(instructorId) {
    const course = await CourseModel.create({
        title: "Gentle Hatha for Beginners", level: "beginner", type: "WEEKLY_BLOCK",
        allowDropIn: true, startDate: "2026-05-12", endDate: "2026-06-16",
        instructorId, location: "Studio C", price: 90, dropInPrice: 16,
        description: "A six-week block ideal for absolute beginners or those returning after a long break."
    });
    const first = new Date("2026-05-12T10:00:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 60, capacity: 18,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 6. Jun 2026 - Weekend Workshop (intermediate, Chen)
async function createInversionWorkshop(instructorId) {
    const course = await CourseModel.create({
        title: "Inversions & Arm Balances Workshop", level: "intermediate", type: "WEEKEND_WORKSHOP",
        allowDropIn: false, startDate: "2026-06-13", endDate: "2026-06-14",
        instructorId, location: "Studio A", price: 110,
        description: "Safely build the strength and technique needed for headstands, handstands, and crow pose."
    });
    const base = new Date("2026-06-13T11:00:00");
    const sessions = await buildSessions(course._id, [
        { start: base,              durationMins: 90, capacity: 14 },
        { start: addHours(base, 2), durationMins: 90, capacity: 14 },
        { start: addDays(base, 1),  durationMins: 90, capacity: 14 },
    ]);
    return { course, sessions };
}

// 7. Jun–Aug 2026 - Weekly Block (all levels, Ben, drop-in allowed, morning slot)
async function createMorningFlow(instructorId) {
    const course = await CourseModel.create({
        title: "Morning Flow — All Levels", level: "all", type: "WEEKLY_BLOCK",
        allowDropIn: true, startDate: "2026-06-03", endDate: "2026-08-26",
        instructorId, location: "Studio B", price: 240, dropInPrice: 14,
        description: "A 12-week early-morning flow class open to all abilities. Start your day grounded and energised."
    });
    const first = new Date("2026-06-03T07:00:00");
    const slots = Array.from({ length: 12 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 45, capacity: 20,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 8. Jul 2026 - Weekend Workshop (beginner, Ava)
async function createRestorativeRetreat(instructorId) {
    const course = await CourseModel.create({
        title: "Restorative Yoga Day Retreat", level: "beginner", type: "WEEKEND_WORKSHOP",
        allowDropIn: false, startDate: "2026-07-19", endDate: "2026-07-19",
        instructorId, location: "The Loft", price: 65,
        description: "A full Saturday of slow, supported postures, yoga nidra, and guided relaxation. No experience needed."
    });
    const base = new Date("2026-07-19T10:00:00");
    const sessions = await buildSessions(course._id, [
        { start: base,              durationMins: 75, capacity: 16 },
        { start: addHours(base, 2), durationMins: 60, capacity: 16 },
        { start: addHours(base, 4), durationMins: 75, capacity: 16 },
    ]);
    return { course, sessions };
}

// 9. Aug 2026 - Weekly Block (advanced, Chen)
async function createStrengthAndBalance(instructorId) {
    const course = await CourseModel.create({
        title: "Strength & Balance Intensive", level: "advanced", type: "WEEKLY_BLOCK",
        allowDropIn: false, startDate: "2026-08-03", endDate: "2026-08-31",
        instructorId, location: "Studio A", price: 100,
        description: "Five weeks focusing on deep core activation, single-leg balances, and peak strength postures."
    });
    const first = new Date("2026-08-03T18:00:00");
    const slots = Array.from({ length: 5 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 75, capacity: 10,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 10. Aug–Sep 2026 - Weekly Block (intermediate, Raj, drop-in allowed)
async function createAshtangaMysore(instructorId) {
    const course = await CourseModel.create({
        title: "Ashtanga Mysore Style", level: "intermediate", type: "WEEKLY_BLOCK",
        allowDropIn: true, startDate: "2026-08-10", endDate: "2026-09-14",
        instructorId, location: "Studio B", price: 150, dropInPrice: 20,
        description: "Self-paced Mysore practice with hands-on adjustments. Students work through their own sequence at their own pace."
    });
    const first = new Date("2026-08-10T07:30:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 90, capacity: 10,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 11. Sep 2026 - Weekend Workshop (all levels, Ava)
async function createAutumnRenewal(instructorId) {
    const course = await CourseModel.create({
        title: "Autumn Renewal Weekend", level: "all", type: "WEEKEND_WORKSHOP",
        allowDropIn: false, startDate: "2026-09-12", endDate: "2026-09-13",
        instructorId, location: "The Loft", price: 130,
        description: "A weekend blending restorative and gentle Hatha practices to ease the transition into autumn."
    });
    const base = new Date("2026-09-12T10:00:00");
    const sessions = await buildSessions(course._id, [
        { start: base,                durationMins: 90, capacity: 18 },
        { start: addHours(base, 2.5), durationMins: 60, capacity: 18 },
        { start: addDays(base, 1),    durationMins: 90, capacity: 18 },
        { start: addHours(addDays(base, 1), 4), durationMins: 60, capacity: 18 },
    ]);
    return { course, sessions };
}

// 12. Sep–Nov 2026 - Long weekly block (beginner, Isla)
async function createFoundationsBlock(instructorId) {
    const course = await CourseModel.create({
        title: "Yoga Foundations — 10-Week Block", level: "beginner", type: "WEEKLY_BLOCK",
        allowDropIn: false, startDate: "2026-09-07", endDate: "2026-11-09",
        instructorId, location: "Studio C", price: 160,
        description: "A structured 10-week programme that builds a solid foundation in alignment, breathing, and core postures."
    });
    const first = new Date("2026-09-07T11:00:00");
    const slots = Array.from({ length: 10 }, (_, i) => ({
        start: addWeeks(first, i), durationMins: 60, capacity: 16,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

/* ── Run ────────────────────────────────────────────────────── */
async function run() {
    console.log("Starting Seed...");
    await initDb();
    await wipeAll();

    const { instructors } = await createUsers();

    await createSpringMindfulness(instructors.ava._id);
    await createVinyasaFlow(instructors.ben._id);
    await createPowerYoga(instructors.raj._id);
    await createHathaIntro(instructors.isla._id);
    await createGentleHatha(instructors.isla._id);
    await createInversionWorkshop(instructors.chen._id);
    await createMorningFlow(instructors.ben._id);
    await createRestorativeRetreat(instructors.ava._id);
    await createStrengthAndBalance(instructors.chen._id);
    await createAshtangaMysore(instructors.raj._id);
    await createAutumnRenewal(instructors.ava._id);
    await createFoundationsBlock(instructors.isla._id);

    console.log("✅ Seed complete. 12 courses seeded across May–November 2026.");
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});