// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
    bookCourseForUser,
    bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

/* ── Formatters ─────────────────────────────────────────────── */
const fmtDate = (iso) =>
    new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const fmtDateOnly = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const fmtType = (raw) =>
    (raw ?? "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()); // "Weekly Block"

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
                title: "Not found",
                message: "Course not found",
            });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        const rows = sessions.map((s) => ({
            id:        s._id,
            start:     fmtDate(s.startDateTime),
            end:       fmtDate(s.endDateTime),
            duration:  duration(s.startDateTime, s.endDateTime),
            capacity:  s.capacity,
            booked:    s.bookedCount ?? 0,
            spotsLeft: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            isFull:    (s.bookedCount ?? 0) >= (s.capacity ?? 0),
            upcoming:  new Date(s.startDateTime) >= now,
        }));

        res.render("course", {
            title: course.title,
            course: {
                id:          course._id,
                title:       course.title,
                level:       course.level,
                type:        fmtType(course.type),
                allowDropIn: course.allowDropIn,
                startDate:   course.startDate ? fmtDateOnly(course.startDate) : "",
                endDate:     course.endDate   ? fmtDateOnly(course.endDate)   : "",
                description: course.description,
                sessionsCount: sessions.length,
            },
            sessions: rows,
        });
    } catch (err) {
        next(err);
    }
};

/* ── Book course ────────────────────────────────────────────── */
export const postBookCourse = async (req, res, next) => {
    try {
        const booking = await bookCourseForUser(req.user._id, req.params.id);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        res.status(400).render("error", {
            title: "Booking failed",
            message: err.message,
        });
    }
};

/* ── Book session ───────────────────────────────────────────── */
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
import { UserModel } from "../models/userModel.js";

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
/* ── Booking confirmation ───────────────────────────────────── */
export const bookingConfirmationPage = async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.bookingId);
        if (!booking)
            return res.status(404).render("error", {
                title: "Not found",
                message: "Booking not found",
            });

        res.render("booking_confirmation", {
            title: "Booking confirmation",
            booking: {
                id:        booking._id,
                type:      booking.type,
                status:    req.query.status || booking.status,
                createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
            },
        });
    } catch (err) {
        next(err);
    }

};