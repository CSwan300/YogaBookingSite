// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
    bookCourseForUser,
    bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

/* ── Formatters ─────────────────────────────────────────────── */
const fmtDate = (iso) =>
    new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year:    "numeric",
        month:   "short",
        day:     "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
    });

const fmtDateOnly = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
        year:  "numeric",
        month: "short",
        day:   "numeric",
    });

const fmtTimeOnly = (iso) =>
    new Date(iso).toLocaleTimeString("en-GB", {
        hour:   "2-digit",
        minute: "2-digit",
    });

const fmtType = (raw) =>
    (raw ?? "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const duration = (start, end) => {
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60 ? (mins % 60) + "m" : ""}`.trim()
        : `${mins}m`;
};

/* ── Home ───────────────────────────────────────────────────── */
export const homePage = async (req, res, next) => {
    try {
        const courses = await CourseModel.list();
        const cards = await Promise.all(
            courses.map(async (c) => {
                const sessions = await SessionModel.listByCourse(c._id);
                const nextSession = sessions[0];
                return {
                    id:            c._id,
                    title:         c.title,
                    level:         c.level,
                    type:          fmtType(c.type),
                    allowDropIn:   c.allowDropIn,
                    startDate:     c.startDate ? fmtDateOnly(c.startDate) : "",
                    endDate:       c.endDate   ? fmtDateOnly(c.endDate)   : "",
                    nextSession:   nextSession  ? fmtDate(nextSession.startDateTime) : "TBA",
                    sessionsCount: sessions.length,
                    description:   c.description,
                };
            })
        );
        res.render("home", { title: "Yoga Courses", courses: cards });
    } catch (err) {
        next(err);
    }
};

/* ── Course detail ──────────────────────────────────────────── */
export const courseDetailPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Course not found",
            });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        const rows = sessions.map((s) => ({
            id:          s._id,
            start:       fmtDate(s.startDateTime),
            end:         fmtDate(s.endDateTime),
            duration:    duration(s.startDateTime, s.endDateTime),
            capacity:    s.capacity,
            booked:      s.bookedCount ?? 0,
            spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
            upcoming:    new Date(s.startDateTime) >= now,
            allowDropIn: course.allowDropIn,
            user:        req.user ? {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            } : null,
        }));

        res.render("course", {
            title: course.title,
            course: {
                id:            course._id,
                title:         course.title,
                level:         course.level,
                type:          fmtType(course.type),
                allowDropIn:   course.allowDropIn,
                startDate:     course.startDate ? fmtDateOnly(course.startDate) : "",
                endDate:       course.endDate   ? fmtDateOnly(course.endDate)   : "",
                description:   course.description,
                sessionsCount: sessions.length,
            },
            sessions: rows,
            user: req.user ? {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            } : null,
        });
    } catch (err) {
        next(err);
    }
};

/* ── Book course page (registered users only) ───────────────── */
export const getBookCoursePage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Course not found",
            });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        const rows = sessions
            .filter(s => new Date(s.startDateTime) >= now)
            .map(s => ({
                id:        s._id,
                start:     fmtDate(s.startDateTime),
                remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
                isFull:    (s.bookedCount ?? 0) >= (s.capacity ?? 0),
            }));

        res.render("course_book", {
            title: `Book: ${course.title}`,
            course: {
                id:          course._id,
                title:       course.title,
                level:       course.level,
                type:        fmtType(course.type),
                allowDropIn: course.allowDropIn,
                startDate:   course.startDate ? fmtDateOnly(course.startDate) : "",
                endDate:     course.endDate   ? fmtDateOnly(course.endDate)   : "",
                description: course.description,
            },
            sessions:      rows,
            sessionsCount: rows.length,
            user: {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            },
        });
    } catch (err) {
        next(err);
    }
};

/* ── Book course (registered users only) ───────────────────── */
export const postBookCourse = async (req, res, next) => {
    try {
        const { consent } = req.body;
        const errors = [];

        if (!consent) errors.push("You must agree to the booking terms & health disclaimer.");

        if (errors.length) {
            const course = await CourseModel.findById(req.params.id);
            const sessions = await SessionModel.listByCourse(course._id);
            const now = new Date();

            return res.status(400).render("course_book", {
                title: `Book: ${course.title}`,
                course: {
                    id:          course._id,
                    title:       course.title,
                    level:       course.level,
                    type:        fmtType(course.type),
                    allowDropIn: course.allowDropIn,
                    startDate:   course.startDate ? fmtDateOnly(course.startDate) : "",
                    endDate:     course.endDate   ? fmtDateOnly(course.endDate)   : "",
                    description: course.description,
                },
                sessions: sessions
                    .filter(s => new Date(s.startDateTime) >= now)
                    .map(s => ({
                        id:        s._id,
                        start:     fmtDate(s.startDateTime),
                        remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
                    })),
                sessionsCount: sessions.length,
                user: {
                    id:    req.user._id,
                    name:  req.user.name,
                    email: req.user.email,
                },
                errors: { list: errors },
                notes: req.body.notes,
            });
        }

        const booking = await bookCourseForUser(req.user._id, req.params.id);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        res.status(400).render("error", {
            title:   "Booking failed",
            message: err.message,
        });
    }
};

/* ── Book session (registered users only) ──────────────────── */
export const postBookSession = async (req, res, next) => {
    try {
        const booking = await bookSessionForUser(req.user._id, req.params.id);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        const message =
            err.code === "DROPIN_NOT_ALLOWED"
                ? "Drop-ins are not allowed for this course."
                : err.message;
        res.status(400).render("error", { title: "Booking failed", message });
    }
};

/* ── Cancel booking (registered users only) ─────────────────── */
export const postCancelBooking = async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.bookingId);
        if (!booking)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Booking not found",
            });

        if (booking.userId.toString() !== req.user._id.toString())
            return res.status(403).render("error", {
                title:   "Access denied",
                message: "You can only cancel your own bookings.",
            });

        if (booking.status !== "CANCELLED") {
            if (booking.sessionIds?.length) {
                for (const sid of booking.sessionIds) {
                    await SessionModel.incrementBookedCount(sid, -1);
                }
            }
            await BookingModel.cancel(booking._id);
        }

        const returnTo = req.body.returnTo || "/";
        res.redirect(
            `/bookings/${booking._id}?status=CANCELLED&returnTo=${encodeURIComponent(returnTo)}`
        );
    } catch (err) {
        next(err);
    }
};

/* ── Schedule ───────────────────────────────────────────────── */
export const schedulePage = async (req, res, next) => {
    try {
        const showMyBookings = req.query.my === "1";

        const courses = await CourseModel.list();
        const courseMap = Object.fromEntries(courses.map(c => [c._id, c]));

        const allSessions = (
            await Promise.all(courses.map(c => SessionModel.listByCourse(c._id)))
        ).flat();

        let bookedSessionIds = new Set();
        let bookingBySessionId = {};
        if (req.user) {
            const bookings = await BookingModel.listByUser(req.user._id);
            for (const b of bookings) {
                if (b.status === "CANCELLED") continue;
                for (const sid of (b.sessionIds ?? [])) {
                    bookedSessionIds.add(sid);
                    bookingBySessionId[sid] = b._id;
                }
            }
        }

        const sessions = showMyBookings
            ? allSessions.filter(s => bookedSessionIds.has(s._id))
            : allSessions;

        const weekMap = new Map();

        for (const s of sessions) {
            const start  = new Date(s.startDateTime);
            const course = courseMap[s.courseId];
            if (!course) continue;

            const monday = new Date(start);
            monday.setHours(0, 0, 0, 0);
            monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
            const weekKey = monday.toISOString();

            if (!weekMap.has(weekKey)) weekMap.set(weekKey, { monday, days: new Map() });

            const dayKey = start.toDateString();
            const week   = weekMap.get(weekKey);
            if (!week.days.has(dayKey)) week.days.set(dayKey, { date: start, sessions: [] });

            const isBooked = bookedSessionIds.has(s._id);
            week.days.get(dayKey).sessions.push({
                id:          s._id,
                start:       fmtTimeOnly(s.startDateTime),
                end:         fmtTimeOnly(s.endDateTime),
                duration:    duration(s.startDateTime, s.endDateTime),
                courseTitle: course.title,
                courseLevel: course.level,
                courseId:    course._id,
                canBook:     course.allowDropIn,
                spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
                isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
                isBooked,
                bookingId:   isBooked ? bookingBySessionId[s._id] : null,
                user:        req.user ? {
                    id:    req.user._id,
                    name:  req.user.name,
                    email: req.user.email,
                } : null,
            });
        }

        const weeks = Array.from(weekMap.entries())
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([, week]) => {
                const days = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date(week.monday);
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
                const weekEnd   = new Date(week.monday.getTime() + 6 * 86400000)
                    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                return { label: `${weekStart} – ${weekEnd}`, days };
            });

        res.render("schedule", {
            title:          "Schedule",
            weeks,
            showMyBookings,
            user: req.user ? {
                id:    req.user._id,
                name:  req.user.name,
                email: req.user.email,
            } : null,
        });
    } catch (err) {
        next(err);
    }
};

/* ── Instructors (public) ───────────────────────────────────── */
export const instructorsPage = async (req, res, next) => {
    try {
        const users = await UserModel.list();
        const instructors = users
            .filter(u => u.role === "instructor")
            .map(u => ({
                id:    u._id,
                name:  u.name,
                email: u.email,
            }));

        res.render("instructors", { title: "Our Instructors", instructors });
    } catch (err) {
        next(err);
    }
};

/* ── About ──────────────────────────────────────────────────── */
export const aboutPage = (req, res) => {
    res.render("about", {
        title: "About Us",
        studio: {
            name:        "Yoga Studio",
            tagline:     "Yoga for Yogas sake",
            description: "there would be a description here but i cant think off one.",
            mission:     "to make you half as flexable as you want to be.",
        },
        team:    { members: [] },
        contact: {
            address: "123 Example Street, Glasgow",
            phone:   "+44 131 000 0000",
            email:   "theemailgoeshere@gmail.com",
        },
        social: {
            instagram: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            facebook:  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            twitter:   "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
    });
};

/* ── Booking confirmation (registered users only) ───────────── */
export const bookingConfirmationPage = async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.bookingId);
        if (!booking)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Booking not found",
            });

        const status   = req.query.status || booking.status;
        const returnTo = req.query.returnTo
            ? decodeURIComponent(req.query.returnTo)
            : req.headers.referer || "/";

        res.render("booking_confirmation", {
            title: "Booking confirmation",
            booking: {
                id:        booking._id,
                type:      booking.type,
                status,
                createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
            },
            isCancelled: status === "CANCELLED",
            returnTo,
        });
    } catch (err) {
        next(err);
    }
};