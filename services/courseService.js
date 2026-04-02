// services/courseService.js
// Business logic for courses and sessions.

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { fmtDateOnly, fmtDate, fmtTimeOnly, fmtType, duration } from "./formatService.js";

/**
 * @typedef {Object} CourseInput
 * @property {string} title
 * @property {string} level - e.g., 'beginner', 'intermediate', 'advanced'
 * @property {string} type - e.g., 'WEEKLY_BLOCK', 'WEEKEND_WORKSHOP'
 * @property {number} price
 * @property {boolean} allowDropIn
 * @property {number} [dropInPrice]
 * @property {string} location
 * @property {string} description
 */

/**
 * @typedef {Object} SessionInput
 * @property {string} courseId
 * @property {string} [start] - Legacy start field mapping
 * @property {string} [end] - Legacy end field mapping
 * @property {string} [startDateTime] - ISO Date string
 * @property {string} [endDateTime] - ISO Date string
 * @property {number} capacity
 * @property {number} [bookedCount]
 */

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a view-ready shape for a course document.
 * Maps DB fields (price, location) to template variables and handles fallbacks.
 * * @param {Object} c - Raw course document from the DB
 * @returns {Object}
 */
export const buildCourseShape = (c) => ({
    id:          c._id,
    title:       c.title,
    level:       c.level,
    type:        fmtType(c.type),
    price:       c.price ?? 0,
    allowDropIn: c.allowDropIn,
    location:    c.location || "TBA",
    displayDropInPrice: c.dropInPrice || "15",
    startDate:   c.startDate ? fmtDateOnly(c.startDate) : "",
    endDate:     c.endDate   ? fmtDateOnly(c.endDate)   : "",
    description: c.description || "",
});

/**
 * Returns a view-ready list of session rows for the booking form.
 * * @param {Array<Object>} sessions - Raw session documents
 * @param {Date} now - Current date used to determine past sessions
 * @returns {Array<Object>}
 */
export const buildSessionRows = (sessions, now) =>
    sessions.map((s) => ({
        id:        String(s._id),
        start:     fmtDate(s.startDateTime),
        remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        isFull:    (s.bookedCount ?? 0) >= (s.capacity ?? 0),
        isPast:    new Date(s.startDateTime) < now,
    }));

// ---------------------------------------------------------------------------
// CRUD & Data Operations (Refactored from Controller)
// ---------------------------------------------------------------------------

/**
 * Lists all raw course documents from the database.
 * @returns {Promise<Array<Object>>}
 */
export const listAllCourses = async () => {
    return await CourseModel.list();
};

/**
 * Creates a new course record.
 * @param {CourseInput} courseData
 * @returns {Promise<Object>}
 */
export const createNewCourse = async (courseData) => {
    return await CourseModel.create(courseData);
};

/**
 * Creates a new session for a specific course.
 * @param {SessionInput} sessionData
 * @returns {Promise<Object>}
 */
export const createNewSession = async (sessionData) => {
    const { courseId, start, end, startDateTime, endDateTime, capacity, bookedCount } = sessionData;

    return await SessionModel.create({
        courseId,
        startDateTime: startDateTime || start,
        endDateTime:   endDateTime   || end,
        capacity,
        bookedCount:   bookedCount ?? 0,
    });
};

/**
 * Lists all sessions associated with a specific course ID.
 * @param {string} courseId
 * @returns {Promise<Array<Object>>}
 */
export const listSessionsByCourseId = async (courseId) => {
    return await SessionModel.listByCourse(courseId);
};

// ---------------------------------------------------------------------------
// View-Specific Data Orchestration
// ---------------------------------------------------------------------------

/**
 * Fetches all courses with future sessions and returns enriched card objects.
 * Fixes the 10x vs 8x pricing issue by calculating price based on future sessions.
 * * @param {{ now?: Date }} [opts]
 * @returns {Promise<Array<Object>>}
 */
export const getUpcomingCourseCards = async ({ now = new Date() } = {}) => {
    const courses = await CourseModel.list();

    const cards = await Promise.all(
        courses.map(async (c) => {
            const sessions = await SessionModel.listByCourse(c._id);
            const future   = sessions.filter((s) => new Date(s.startDateTime) >= now);

            // If no future sessions, don't show the card at all
            if (!future.length) return null;

            const baseShape = buildCourseShape(c);

            /**
             * LOGIC FIX:
             * Calculate the price based on the number of FUTURE sessions.
             */
            const sessionRate = c.dropInPrice || 15;
            const displayPrice = c.allowDropIn
                ? (future.length * sessionRate)
                : c.price;

            return {
                ...baseShape,
                price: displayPrice, // Overwrite static price with dynamic calculation
                nextSession: fmtDate(future[0].startDateTime),
                sessionsCount: future.length,
            };
        })
    );

    return cards.filter(Boolean);
};

/**
 * Fetches course details and calculates dynamic pricing for remaining sessions.
 * @param {string} courseId
 * @param {Object|null} user
 * @returns {Promise<Object>}
 */
export const getCourseDetail = async (courseId, user = null) => {
    const course = await CourseModel.findById(courseId);
    if (!course) {
        const err = new Error("Course not found");
        err.code  = "NOT_FOUND";
        throw err;
    }

    const sessions = await SessionModel.listByCourse(course._id);
    const now      = new Date();
    const courseShape = buildCourseShape(course);

    const upcomingSessions = sessions.filter(s => new Date(s.startDateTime) >= now);

    const sessionRate = course.dropInPrice || 15;
    const dynamicTotal = course.allowDropIn
        ? (upcomingSessions.length * sessionRate)
        : course.price;

    const rows = sessions.map((s) => ({
        id:          String(s._id),
        courseId:    String(course._id),
        start:       fmtDate(s.startDateTime),
        end:         fmtDate(s.endDateTime),
        duration:    duration(s.startDateTime, s.endDateTime),
        capacity:    s.capacity,
        booked:      s.bookedCount ?? 0,
        spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        remaining:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
        upcoming:    new Date(s.startDateTime) >= now,
        isPast:      new Date(s.startDateTime) < now,
        allowDropIn: course.allowDropIn,
        dropInPrice: courseShape.displayDropInPrice,
    }));

    return {
        course: {
            ...courseShape,
            dynamicTotal,
            upcomingCount: upcomingSessions.length
        },
        sessions: rows
    };
};

/**
 * Fetches data needed for the full-course booking page.
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
export const getBookCourseData = async (courseId) => {
    const course = await CourseModel.findById(courseId);
    if (!course) {
        const err = new Error("Course not found");
        err.code  = "NOT_FOUND";
        throw err;
    }

    const sessions    = await SessionModel.listByCourse(course._id);
    const now         = new Date();
    const rows        = buildSessionRows(sessions, now);

    return {
        course:        buildCourseShape(course),
        sessions:      rows,
        sessionsCount: rows.filter((s) => !s.isPast).length,
    };
};

/**
 * Fetches data for the drop-in session selection page.
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
export const getBookSessionData = async (courseId) => {
    const course = await CourseModel.findById(courseId);
    if (!course) {
        const err = new Error("Course not found");
        err.code  = "NOT_FOUND";
        throw err;
    }

    if (!course.allowDropIn) {
        const err = new Error("Drop-ins are not enabled for this course.");
        err.code  = "DROPIN_NOT_ALLOWED";
        throw err;
    }

    const sessions = await SessionModel.listByCourse(course._id);
    const now      = new Date();

    const rows = sessions.map((s) => {
        const remaining = Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0));
        return {
            id:              String(s._id),
            start:           fmtDate(s.startDateTime),
            remaining,
            isFull:          remaining === 0,
            pluralRemaining: remaining !== 1,
            isPast:          new Date(s.startDateTime) < now,
        };
    });

    return { course: buildCourseShape(course), sessions: rows };
};

/**
 * Fetches data to book a specific single session.
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export const getSingleSessionBookData = async (sessionId) => {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
        const err = new Error("Session not found.");
        err.code  = "NOT_FOUND";
        throw err;
    }

    const course = await CourseModel.findById(session.courseId);
    if (!course) {
        const err = new Error("Course not found.");
        err.code  = "NOT_FOUND";
        throw err;
    }

    if (!course.allowDropIn) {
        const err = new Error("Drop-ins are disabled for this course.");
        err.code  = "DROPIN_NOT_ALLOWED";
        throw err;
    }

    const now       = new Date();
    const remaining = Math.max(0, (session.capacity ?? 0) - (session.bookedCount ?? 0));

    return {
        course:   buildCourseShape(course),
        sessions: [{
            id:              String(session._id),
            start:           fmtDate(session.startDateTime),
            remaining,
            isFull:          remaining === 0,
            pluralRemaining: remaining !== 1,
            isPast:          new Date(session.startDateTime) < now,
        }],
    };
};

/**
 * Fetches and enriches sessions grouped by week for the schedule page.
 * @param {Set<string>} bookedSessionIds
 * @param {Object} bookingBySessionId
 * @param {boolean} showMyBookings
 * @returns {Promise<Array<Object>>}
 */
export const getScheduleWeeks = async (bookedSessionIds, bookingBySessionId, showMyBookings) => {
    const courses    = await CourseModel.list();
    const courseMap  = Object.fromEntries(courses.map((c) => [String(c._id), c]));

    const rawSessions = (
        await Promise.all(courses.map((c) => SessionModel.listByCourse(c._id)))
    ).flat();

    const allSessions = Array.from(
        new Map(rawSessions.map((s) => [String(s._id), s])).values()
    );

    const now      = new Date();
    const sessions = (
        showMyBookings
            ? allSessions.filter((s) => bookedSessionIds.has(String(s._id)))
            : allSessions
    ).filter((s) => new Date(s.startDateTime) >= now);

    const weekMap = new Map();

    for (const s of sessions) {
        const start  = new Date(s.startDateTime);
        const course = courseMap[String(s.courseId)];
        if (!course) continue;

        const monday = new Date(start);
        monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        const weekKey = monday.toISOString();

        if (!weekMap.has(weekKey)) weekMap.set(weekKey, { monday, days: new Map() });

        const dayKey = start.toDateString();
        const week   = weekMap.get(weekKey);
        if (!week.days.has(dayKey)) week.days.set(dayKey, { date: start, sessions: [] });

        const sIdStr   = String(s._id);
        const isBooked = bookedSessionIds.has(sIdStr);

        week.days.get(dayKey).sessions.push({
            id:          sIdStr,
            start:       fmtTimeOnly(s.startDateTime),
            end:         fmtTimeOnly(s.endDateTime),
            duration:    duration(s.startDateTime, s.endDateTime),
            courseTitle: course.title,
            courseLevel: course.level,
            courseId:    String(course._id),
            location:    course.location || "TBA",
            canBook:     course.allowDropIn,
            spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
            isBooked,
            bookingId:   isBooked ? bookingBySessionId[sIdStr] : null,
            showMyBookings,
        });
    }

    return Array.from(weekMap.entries())
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .map(([, week]) => {
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d   = new Date(week.monday);
                d.setDate(d.getDate() + i);
                const key         = d.toDateString();
                const daySessions = week.days.has(key)
                    ? week.days.get(key).sessions.sort((a, b) => a.start.localeCompare(b.start))
                    : [];
                days.push({
                    dayName:  d.toLocaleDateString("en-GB", { weekday: "short" }),
                    date:     d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                    sessions: daySessions,
                    isEmpty:  daySessions.length === 0,
                });
            }

            const weekStart = week.monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const weekEnd   = new Date(week.monday.getTime() + 6 * 86400000).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
            });

            return { label: `${weekStart} – ${weekEnd}`, days };
        });
};