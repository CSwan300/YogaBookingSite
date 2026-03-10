// seed/seed.js
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

const iso = (d) => new Date(d).toISOString();
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
        usersDb.persistence.compactDatafile(),
        coursesDb.persistence.compactDatafile(),
        sessionsDb.persistence.compactDatafile(),
        bookingsDb.persistence.compactDatafile(),
    ]);
}

/* ── Helpers ────────────────────────────────────────────────── */
async function buildSessions(courseId, slots) {
    // slots: [{ start: Date, durationMins: number, capacity: number }]
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
    const [fiona, marcus, priya, ava, ben, chen, isla] = await Promise.all([
        // Students
        UserModel.create({ name: "Fiona",  email: "fiona@student.local",  role: "student" }),
        UserModel.create({ name: "Marcus", email: "marcus@student.local", role: "student" }),
        UserModel.create({ name: "Priya",  email: "priya@student.local",  role: "student" }),
        // Instructors
        UserModel.create({ name: "Ava",  email: "ava@yoga.local",  role: "instructor" }),
        UserModel.create({ name: "Ben",  email: "ben@yoga.local",  role: "instructor" }),
        UserModel.create({ name: "Chen", email: "chen@yoga.local", role: "instructor" }),
        UserModel.create({ name: "Isla", email: "isla@yoga.local", role: "instructor" }),
    ]);
    return { students: [fiona, marcus, priya], instructors: { ava, ben, chen, isla } };
}

/* ── Courses ────────────────────────────────────────────────── */

// 1. Weekend workshop — beginner, no drop-in
async function createWinterMindfulness(instructorId) {
    const course = await CourseModel.create({
        title:        "Winter Mindfulness Workshop",
        level:        "beginner",
        type:         "WEEKEND_WORKSHOP",
        allowDropIn:  false,
        startDate:    "2026-01-10",
        endDate:      "2026-01-11",
        instructorId,
        sessionIds:   [],
        description:  "Two days of breath, posture alignment, and meditation. Perfect for those new to yoga looking for a gentle introduction.",
    });
    const base = new Date("2026-01-10T09:00:00");
    const slots = [
        { start: base,                      durationMins: 60, capacity: 20 },
        { start: addHours(base, 2),         durationMins: 60, capacity: 20 },
        { start: addHours(base, 4),         durationMins: 60, capacity: 20 },
        { start: addDays(base, 1),          durationMins: 60, capacity: 20 }, // Sun
        { start: addHours(addDays(base, 1), 2), durationMins: 60, capacity: 20 },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 2. Weekly block — intermediate, drop-in OK
async function createVinyasaFlow(instructorId) {
    const course = await CourseModel.create({
        title:        "12‑Week Vinyasa Flow",
        level:        "intermediate",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  true,
        startDate:    "2026-02-02",
        endDate:      "2026-04-20",
        instructorId,
        sessionIds:   [],
        description:  "Progressive sequences building strength and flexibility. Each week layers new transitions onto a familiar foundation.",
    });
    const first = new Date("2026-02-02T18:30:00");
    const slots = Array.from({ length: 12 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 75,
        capacity:     18,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 3. Weekly block — beginner, drop-in OK
async function createMorningHatha(instructorId) {
    const course = await CourseModel.create({
        title:        "8‑Week Morning Hatha",
        level:        "beginner",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  true,
        startDate:    "2026-03-04",
        endDate:      "2026-04-22",
        instructorId,
        sessionIds:   [],
        description:  "Gentle Hatha practice to start your Wednesday morning with calm focus. Ideal for complete beginners and those returning after a break.",
    });
    const first = new Date("2026-03-04T07:30:00"); // Wednesday 7:30am
    const slots = Array.from({ length: 8 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 60,
        capacity:     15,
        bookedCount:  i < 3 ? 5 : 0, // first 3 already have some bookings
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 4. Weekend workshop — advanced, no drop-in
async function createArmBalanceIntensive(instructorId) {
    const course = await CourseModel.create({
        title:        "Arm Balance Intensive",
        level:        "advanced",
        type:         "WEEKEND_WORKSHOP",
        allowDropIn:  false,
        startDate:    "2026-04-18",
        endDate:      "2026-04-19",
        instructorId,
        sessionIds:   [],
        description:  "A focused weekend dedicated to crow pose, handstands, and flying pigeon. Prior inversion experience required.",
    });
    const base = new Date("2026-04-18T10:00:00");
    const slots = [
        { start: base,                          durationMins: 90, capacity: 12 },
        { start: addHours(base, 2.5),           durationMins: 90, capacity: 12 },
        { start: addDays(base, 1),              durationMins: 90, capacity: 12 },
        { start: addHours(addDays(base, 1), 3), durationMins: 90, capacity: 12 },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 5. Weekly block — intermediate, no drop-in (block booking only)
async function createYinRestorative(instructorId) {
    const course = await CourseModel.create({
        title:        "6‑Week Yin & Restorative",
        level:        "intermediate",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  false,
        startDate:    "2026-05-07",
        endDate:      "2026-06-11",
        instructorId,
        sessionIds:   [],
        description:  "Slow, floor-based postures held for 3–5 minutes to release deep connective tissue. Props provided. Block booking only — continuity is key.",
    });
    const first = new Date("2026-05-07T19:00:00"); // Thursday 7pm
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 90,
        capacity:     14,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 6. Weekend workshop — all levels, drop-in OK
async function createSundaySoundBath(instructorId) {
    const course = await CourseModel.create({
        title:        "Sunday Sound Bath & Yoga Nidra",
        level:        "beginner",
        type:         "WEEKEND_WORKSHOP",
        allowDropIn:  true,
        startDate:    "2026-06-07",
        endDate:      "2026-06-07",
        instructorId,
        sessionIds:   [],
        description:  "A single restorative Sunday afternoon combining gentle movement, guided yoga nidra, and a live Tibetan singing bowl sound bath. All welcome.",
    });
    const base = new Date("2026-06-07T14:00:00");
    const slots = [
        { start: base,              durationMins: 30,  capacity: 25 }, // gentle movement
        { start: addMins(base, 40), durationMins: 45,  capacity: 25 }, // nidra
        { start: addMins(base, 95), durationMins: 45,  capacity: 25 }, // sound bath
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

/* ── Verify ─────────────────────────────────────────────────── */
async function verifyAndReport() {
    const [users, courses, sessions, bookings] = await Promise.all([
        usersDb.count({}),
        coursesDb.count({}),
        sessionsDb.count({}),
        bookingsDb.count({}),
    ]);
    console.log("\n— Verification —");
    console.log("Users   :", users);
    console.log("Courses :", courses);
    console.log("Sessions:", sessions);
    console.log("Bookings:", bookings);
    if (courses === 0 || sessions === 0) {
        throw new Error("Seed finished but no courses/sessions were created.");
    }
}

/* ── Run ────────────────────────────────────────────────────── */
async function run() {
    console.log("Initializing DB…");
    await initDb();

    console.log("Wiping existing data…");
    await wipeAll();

    console.log("Creating users…");
    const { students, instructors } = await createUsers();

    console.log("Creating courses…");
    const [c1, c2, c3, c4, c5, c6] = await Promise.all([
        createWinterMindfulness(instructors.ava._id),
        createVinyasaFlow(instructors.ben._id),
        createMorningHatha(instructors.isla._id),
        createArmBalanceIntensive(instructors.chen._id),
        createYinRestorative(instructors.ava._id),
        createSundaySoundBath(instructors.isla._id),
    ]);

    await verifyAndReport();

    console.log("\n✅ Seed complete.");
    console.log("Students            :", students.map(s => `${s.name} (${s._id})`).join(", "));
    console.log("Instructors         :", Object.values(instructors).map(i => `${i.name} (${i._id})`).join(", "));
    console.log("Courses created     :", 6);
    console.log("  1.", c1.course.title, `— ${c1.sessions.length} sessions`);
    console.log("  2.", c2.course.title, `— ${c2.sessions.length} sessions`);
    console.log("  3.", c3.course.title, `— ${c3.sessions.length} sessions`);
    console.log("  4.", c4.course.title, `— ${c4.sessions.length} sessions`);
    console.log("  5.", c5.course.title, `— ${c5.sessions.length} sessions`);
    console.log("  6.", c6.course.title, `— ${c6.sessions.length} sessions`);
}

run().catch((err) => {
    console.error("❌ Seed failed:", err?.stack || err);
    process.exit(1);
});