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
import { BookingModel } from "../models/bookingModel.js";

const hashPassword = (password) => password;

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
        usersDb.persistence.compactDatafile(),
        coursesDb.persistence.compactDatafile(),
        sessionsDb.persistence.compactDatafile(),
        bookingsDb.persistence.compactDatafile(),
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
    const [
        admin,
        // Students
        fiona, marcus, priya, lena, tom,
        sara, james, nina, oliver, grace,
        // Instructors
        ava, ben, chen, isla, raj,
    ] = await Promise.all([
        // ── Organiser ──────────────────────────────────────────
        UserModel.create({
            name:     "Admin",
            email:    "admin@yoga.local",
            role:     "organiser",
            password: hashPassword("admin1234"),
        }),

        // ── Original Students ───────────────────────────────────
        UserModel.create({
            name:     "Fiona",
            email:    "fiona@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Marcus",
            email:    "marcus@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Priya",
            email:    "priya@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Lena",
            email:    "lena@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Tom",
            email:    "tom@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),

        // ── New Students ────────────────────────────────────────
        UserModel.create({
            name:     "Sara",
            email:    "sara@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "James",
            email:    "james@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Nina",
            email:    "nina@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Oliver",
            email:    "oliver@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),
        UserModel.create({
            name:     "Grace",
            email:    "grace@student.local",
            role:     "student",
            password: hashPassword("password123"),
        }),

        // ── Original Instructors ────────────────────────────────
        UserModel.create({
            name:  "Ava",
            email: "ava@yoga.local",
            role:  "instructor",
            bio:   "Ava has been teaching yoga for over 10 years, specialising in restorative and mindfulness-based practices.",
        }),
        UserModel.create({
            name:  "Ben",
            email: "ben@yoga.local",
            role:  "instructor",
            bio:   "Ben brings a dynamic energy to his Vinyasa classes, blending breath, movement, and mindful transitions.",
        }),
        UserModel.create({
            name:  "Chen",
            email: "chen@yoga.local",
            role:  "instructor",
            bio:   "Chen is an advanced practitioner with a focus on arm balances, inversions, and strength-based yoga.",
        }),
        UserModel.create({
            name:  "Isla",
            email: "isla@yoga.local",
            role:  "instructor",
            bio:   "Isla's gentle approach makes her classes perfect for beginners and those recovering from injury.",
        }),

        // ── New Instructor ──────────────────────────────────────
        UserModel.create({
            name:  "Raj",
            email: "raj@yoga.local",
            role:  "instructor",
            bio:   "Raj specialises in Ashtanga and power yoga, bringing a structured and energetic approach to every session.",
        }),
    ]);

    return {
        organiser:   admin,
        students:    [fiona, marcus, priya, lena, tom, sara, james, nina, oliver, grace],
        instructors: { ava, ben, chen, isla, raj },
    };
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
        location:     "Studio A",
        price:        85,
    });
    const base = new Date("2026-01-10T09:00:00");
    const slots = [
        { start: base,                              durationMins: 60, capacity: 20, bookedCount: 12 },
        { start: addHours(base, 2),                 durationMins: 60, capacity: 20, bookedCount: 10 },
        { start: addHours(base, 4),                 durationMins: 60, capacity: 20, bookedCount: 8  },
        { start: addDays(base, 1),                  durationMins: 60, capacity: 20, bookedCount: 14 },
        { start: addHours(addDays(base, 1), 2),     durationMins: 60, capacity: 20, bookedCount: 11 },
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
        location:     "Studio B",
        price:        180,
        dropInPrice:  18,
    });
    const first = new Date("2026-02-02T18:30:00");
    const slots = Array.from({ length: 12 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 75,
        capacity:     18,
        bookedCount:  i < 4 ? Math.floor(Math.random() * 10) + 5 : 0,
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
        location:     "Studio A",
        price:        120,
        dropInPrice:  16,
    });
    const first = new Date("2026-03-04T07:30:00");
    const slots = Array.from({ length: 8 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 60,
        capacity:     15,
        bookedCount:  i < 3 ? 5 : 0,
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
        location:     "Studio B",
        price:        110,
    });
    const base = new Date("2026-04-18T10:00:00");
    const slots = [
        { start: base,                              durationMins: 90, capacity: 12, bookedCount: 6 },
        { start: addHours(base, 2.5),               durationMins: 90, capacity: 12, bookedCount: 6 },
        { start: addDays(base, 1),                  durationMins: 90, capacity: 12, bookedCount: 4 },
        { start: addHours(addDays(base, 1), 3),     durationMins: 90, capacity: 12, bookedCount: 4 },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 5. Weekly block — intermediate, no drop-in
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
        location:     "Studio A",
        price:        96,
    });
    const first = new Date("2026-05-07T19:00:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 90,
        capacity:     14,
        bookedCount:  i < 2 ? 7 : 0,
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
        location:     "Main Hall",
        price:        35,
        dropInPrice:  35,
    });
    const base = new Date("2026-06-07T14:00:00");
    const slots = [
        { start: base,               durationMins: 30, capacity: 25, bookedCount: 18 },
        { start: addMins(base, 40),  durationMins: 45, capacity: 25, bookedCount: 18 },
        { start: addMins(base, 95),  durationMins: 45, capacity: 25, bookedCount: 18 },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 7. Weekly block — beginner, drop-in OK
async function createBreathwork(instructorId) {
    const course = await CourseModel.create({
        title:        "4‑Week Breathwork & Pranayama",
        level:        "beginner",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  true,
        startDate:    "2026-07-07",
        endDate:      "2026-07-28",
        instructorId,
        sessionIds:   [],
        description:  "A four-week exploration of pranayama techniques from Nadi Shodhana to Kapalabhati. Suitable for all levels — no prior experience required.",
        location:     "Studio A",
        price:        60,
        dropInPrice:  17,
    });
    const first = new Date("2026-07-07T18:00:00");
    const slots = Array.from({ length: 4 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 60,
        capacity:     16,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 8. Weekend workshop — advanced, no drop-in
async function createInversionMasterclass(instructorId) {
    const course = await CourseModel.create({
        title:        "Inversion Masterclass",
        level:        "advanced",
        type:         "WEEKEND_WORKSHOP",
        allowDropIn:  false,
        startDate:    "2026-08-22",
        endDate:      "2026-08-23",
        instructorId,
        sessionIds:   [],
        description:  "Two intensive days covering headstand, shoulderstand, and forearm balance progressions. Wall-assisted entry taught alongside freestanding technique.",
        location:     "Studio B",
        price:        130,
    });
    const base = new Date("2026-08-22T10:00:00");
    const slots = [
        { start: base,                              durationMins: 90, capacity: 10 },
        { start: addHours(base, 2.5),               durationMins: 90, capacity: 10 },
        { start: addDays(base, 1),                  durationMins: 90, capacity: 10 },
        { start: addHours(addDays(base, 1), 2.5),   durationMins: 90, capacity: 10 },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 9. NEW — Weekly block, intermediate, drop-in OK
async function createAshtangaFundamentals(instructorId) {
    const course = await CourseModel.create({
        title:        "8‑Week Ashtanga Fundamentals",
        level:        "intermediate",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  true,
        startDate:    "2026-04-06",
        endDate:      "2026-05-25",
        instructorId,
        sessionIds:   [],
        description:  "A structured introduction to the Ashtanga primary series. Learn the standing and seated sequences with correct vinyasa count and breath synchronisation.",
        location:     "Studio B",
        price:        144,
        dropInPrice:  20,
    });
    const first = new Date("2026-04-06T07:00:00");
    const slots = Array.from({ length: 8 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 90,
        capacity:     14,
        bookedCount:  i < 3 ? 8 : 0,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 10. NEW — Weekend workshop, beginner, drop-in OK
async function createStressReliefWorkshop(instructorId) {
    const course = await CourseModel.create({
        title:        "Stress Relief & Relaxation Workshop",
        level:        "beginner",
        type:         "WEEKEND_WORKSHOP",
        allowDropIn:  true,
        startDate:    "2026-05-16",
        endDate:      "2026-05-16",
        instructorId,
        sessionIds:   [],
        description:  "A half-day workshop combining restorative yoga, breathwork, and guided meditation to help you decompress and reset. No experience needed.",
        location:     "Main Hall",
        price:        40,
        dropInPrice:  40,
    });
    const base = new Date("2026-05-16T10:00:00");
    const slots = [
        { start: base,               durationMins: 45, capacity: 20, bookedCount: 10 },
        { start: addMins(base, 55),  durationMins: 45, capacity: 20, bookedCount: 10 },
        { start: addMins(base, 110), durationMins: 30, capacity: 20, bookedCount: 8  },
    ];
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 11. NEW — Weekly block, advanced, no drop-in
async function createPowerYogaChallenge(instructorId) {
    const course = await CourseModel.create({
        title:        "6‑Week Power Yoga Challenge",
        level:        "advanced",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  false,
        startDate:    "2026-06-15",
        endDate:      "2026-07-20",
        instructorId,
        sessionIds:   [],
        description:  "Six weeks of high-intensity power yoga designed to build serious strength, stamina, and mental resilience. Not for the faint-hearted.",
        location:     "Studio B",
        price:        108,
    });
    const first = new Date("2026-06-15T19:00:00");
    const slots = Array.from({ length: 6 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 60,
        capacity:     12,
        bookedCount:  i < 2 ? 9 : 0,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

// 12. NEW — Weekly block, beginner, drop-in OK
async function createChairYoga(instructorId) {
    const course = await CourseModel.create({
        title:        "4‑Week Chair Yoga",
        level:        "beginner",
        type:         "WEEKLY_BLOCK",
        allowDropIn:  true,
        startDate:    "2026-07-14",
        endDate:      "2026-08-04",
        instructorId,
        sessionIds:   [],
        description:  "Accessible yoga practised entirely from a chair. Ideal for those with limited mobility, seniors, or anyone easing back into movement after injury.",
        location:     "Studio A",
        price:        48,
        dropInPrice:  14,
    });
    const first = new Date("2026-07-14T11:00:00");
    const slots = Array.from({ length: 4 }, (_, i) => ({
        start:        addWeeks(first, i),
        durationMins: 45,
        capacity:     18,
    }));
    const sessions = await buildSessions(course._id, slots);
    return { course, sessions };
}

/* ── Sample bookings ────────────────────────────────────────── */
async function createBookings(students, courses) {
    const [fiona, marcus, priya, lena, tom, sara, james, nina, oliver, grace] = students;
    const { c1, c2, c3, c4, c9, c10 } = courses;

    await Promise.all([
        // Fiona — Vinyasa course
        // Profile: [FG] + Auto-Avatar via Fiona's User ID
        BookingModel.create({
            userId:     fiona._id,
            courseId:   c2.course._id,
            sessionIds: c2.sessions.map(s => s._id),
            type:       "course",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Marcus — Vinyasa drop-in session 1
        // Profile: [M] + Auto-Avatar via Marcus's User ID
        BookingModel.create({
            userId:     marcus._id,
            sessionIds: [c2.sessions[0]._id],
            type:       "session",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Priya — Morning Hatha course
        BookingModel.create({
            userId:     priya._id,
            courseId:   c3.course._id,
            sessionIds: c3.sessions.map(s => s._id),
            type:       "course",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Lena — Arm Balance Intensive
        BookingModel.create({
            userId:     lena._id,
            courseId:   c4.course._id,
            sessionIds: c4.sessions.map(s => s._id),
            type:       "course",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Tom — Ashtanga Fundamentals drop-in session 1
        BookingModel.create({
            userId:     tom._id,
            sessionIds: [c9.sessions[0]._id],
            type:       "session",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Sara — Stress Relief Workshop
        BookingModel.create({
            userId:     sara._id,
            courseId:   c10.course._id,
            sessionIds: c10.sessions.map(s => s._id),
            type:       "course",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // James — Vinyasa drop-in session 2
        BookingModel.create({
            userId:     james._id,
            sessionIds: [c2.sessions[1]._id],
            type:       "session",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
        // Nina — Morning Hatha drop-in session 1
        BookingModel.create({
            userId:     nina._id,
            sessionIds: [c3.sessions[0]._id],
            type:       "session",
            status:     "confirmed",
            createdAt:  new Date().toISOString(),
        }),
    ]);
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
    const { organiser, students, instructors } = await createUsers();

    console.log("Creating courses…");
    const [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12] = await Promise.all([
        createWinterMindfulness(instructors.ava._id),
        createVinyasaFlow(instructors.ben._id),
        createMorningHatha(instructors.isla._id),
        createArmBalanceIntensive(instructors.chen._id),
        createYinRestorative(instructors.ava._id),
        createSundaySoundBath(instructors.isla._id),
        createBreathwork(instructors.ben._id),
        createInversionMasterclass(instructors.chen._id),
        createAshtangaFundamentals(instructors.raj._id),
        createStressReliefWorkshop(instructors.isla._id),
        createPowerYogaChallenge(instructors.raj._id),
        createChairYoga(instructors.ava._id),
    ]);

    console.log("Creating sample bookings…");
    await createBookings(students, { c1, c2, c3, c4, c9, c10 });

    await verifyAndReport();

    console.log("\n✅ Seed complete.");
    console.log("\n— Login credentials —");
    console.log("Organiser : admin@yoga.local       / admin1234");
    console.log("Student 1 : fiona@student.local    / password123");
    console.log("Student 2 : marcus@student.local   / password123");
    console.log("Student 3 : priya@student.local    / password123");
    console.log("Student 4 : lena@student.local     / password123");
    console.log("Student 5 : tom@student.local      / password123");
    console.log("Student 6 : sara@student.local     / password123");
    console.log("Student 7 : james@student.local    / password123");
    console.log("Student 8 : nina@student.local     / password123");
    console.log("Student 9 : oliver@student.local   / password123");
    console.log("Student 10: grace@student.local    / password123");
    console.log("\n— Courses created —");
    console.log("  1.",  c1.course.title,  `— ${c1.sessions.length} sessions`);
    console.log("  2.",  c2.course.title,  `— ${c2.sessions.length} sessions`);
    console.log("  3.",  c3.course.title,  `— ${c3.sessions.length} sessions`);
    console.log("  4.",  c4.course.title,  `— ${c4.sessions.length} sessions`);
    console.log("  5.",  c5.course.title,  `— ${c5.sessions.length} sessions`);
    console.log("  6.",  c6.course.title,  `— ${c6.sessions.length} sessions`);
    console.log("  7.",  c7.course.title,  `— ${c7.sessions.length} sessions`);
    console.log("  8.",  c8.course.title,  `— ${c8.sessions.length} sessions`);
    console.log("  9.",  c9.course.title,  `— ${c9.sessions.length} sessions`);
    console.log("  10.", c10.course.title, `— ${c10.sessions.length} sessions`);
    console.log("  11.", c11.course.title, `— ${c11.sessions.length} sessions`);
    console.log("  12.", c12.course.title, `— ${c12.sessions.length} sessions`);
}

run().catch((err) => {
    console.error("❌ Seed failed:", err?.stack || err);
    process.exit(1);
});