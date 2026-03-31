// controllers/viewsController.js
// Pure page-rendering layer. No business logic lives here.
// All mutations and data transformations are delegated to:
//   - bookingController  (booking / cancellation logic)
//   - profileController  (profile view & edit)
//   - courseController   (course / session API)
//   - organiserController (admin dashboard data)

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { userModel as UserModel } from "../models/userModel.js";
import { requireAuth }  from "../middlewares/auth.js";
import { createSession } from "./courseController.js";
import { coursesListPage as listCourses } from "./coursesListController.js";

import {
    handleBookCourse,
    handleBookSessions,
    handleCancelBooking,
    handleCancelSession,
} from "./bookingController.js";

import {
    getAdminDashboardData,
    getCoursesDashboardData,
    createCourse,
    deleteCourse,
    updateCourse,
    getClassesDashboardData,
    getClassListData,
    getOrganisersData,
    createOrganiser,
    deleteOrganiser,
    getUsersData,
    deleteUser,
    getInstructorsData,
    createInstructor,
    deleteInstructor,
} from "./organiserController.js";

// Re-export profile handlers so routes only need one import target if desired.
export { profilePage, getEditProfilePage, postEditProfile } from "./profileController.js";

// ---------------------------------------------------------------------------
// Date / time formatters  (view-layer only – keep co-located with rendering)
// ---------------------------------------------------------------------------

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
        ? `${Math.floor(mins / 60)}h ${mins % 60 ? mins % 60 + "m" : ""}`.trim()
        : `${mins}m`;
};

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------

export const homePage = async (req, res, next) => {
    try {
        const courses = await CourseModel.list();
        const now = new Date();

        const cards = (
            await Promise.all(
                courses.map(async (c) => {
                    const sessions = await SessionModel.listByCourse(c._id);
                    const future   = sessions.filter((s) => new Date(s.startDateTime) >= now);
                    if (!future.length) return null;
                    return {
                        id:            c._id,
                        title:         c.title,
                        level:         c.level,
                        type:          fmtType(c.type),
                        price:         c.price,
                        allowDropIn:   c.allowDropIn,
                        location:      c.location,
                        startDate:     c.startDate ? fmtDateOnly(c.startDate) : "",
                        endDate:       c.endDate   ? fmtDateOnly(c.endDate)   : "",
                        nextSession:   fmtDate(future[0].startDateTime),
                        sessionsCount: future.length,
                        description:   c.description,
                    };
                })
            )
        ).filter(Boolean);

        res.render("home", { title: "Yoga Courses", courses: cards });
    } catch (err) {
        next(err);
    }
};

export const aboutPage = (req, res) => {
    res.render("about", {
        title: "About Us",
        studio: {
            name:        "Yoga Studio",
            tagline:     "Find balance, build strength, breathe deeper",
            description:
                "Nestled in the heart of the city, our yoga studio offers a sanctuary for body, mind, and spirit. Blending ancient traditions with modern wellness practices, we guide you on a transformative journey toward flexibility, inner peace, and self-discovery.",
            mission:
                "Our mission is to empower every student to unlock their full potential through mindful movement and conscious breath. We create a welcoming space where beginners and experienced practitioners alike can grow, connect, and find their center.",
        },
        team: true,
        contact: {
            address: ["123 Example Street, Glasgow"],
            phone:   ["+44 131 000 0000"],
            email:   ["hello@yogastudio.com"],
        },
        social: {
            instagram: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            facebook:  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            twitter:   "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
    });
};

export const instructorsPage = async (req, res, next) => {
    try {
        const allUsers = await UserModel.list();
        const instructors = allUsers
            .filter((u) => u.role === "instructor")
            .map((u) => ({
                id:    u._id,
                name:  u.name,
                email: u.email,
                bio:   u.bio,
                image:
                    u.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=128`,
            }));

        res.render("instructors", { title: "Our Instructors", instructors });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Course pages
// ---------------------------------------------------------------------------

// listCourses is handled by coursesListController — imported and re-exported above.
export { listCourses };

export const courseDetailPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", { title: "Not found", message: "Course not found" });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

        const rows = sessions.map((s) => ({
            id:          s._id,
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
            dropInPrice: course.dropInPrice ?? null,
            user: req.user
                ? { id: req.user._id, name: req.user.name, email: req.user.email }
                : null,
        }));

        res.render("course", {
            title: course.title,
            course: {
                id:            course._id,
                title:         course.title,
                level:         course.level,
                type:          fmtType(course.type),
                price:         course.price,
                allowDropIn:   course.allowDropIn,
                location:      course.location,
                startDate:     course.startDate ? fmtDateOnly(course.startDate) : "",
                endDate:       course.endDate   ? fmtDateOnly(course.endDate)   : "",
                description:   course.description,
                sessionsCount: sessions.length,
                courseId:      String(course._id),
            },
            sessions: rows,
            user: req.user
                ? { id: req.user._id, name: req.user.name, email: req.user.email }
                : null,
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Booking pages
// ---------------------------------------------------------------------------

export const getBookCoursePage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", { title: "Not found", message: "Course not found" });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();
        const rows = _sessionRows(sessions, now);

        res.render("course_book", {
            title: `Book: ${course.title}`,
            course:        _courseShape(course),
            sessions:      rows,
            sessionsCount: rows.filter((s) => !s.isPast).length,
            user: { id: req.user._id, name: req.user.name, email: req.user.email },
        });
    } catch (err) {
        next(err);
    }
};

export const postBookCourse = async (req, res, next) => {
    try {
        const booking = await handleBookCourse(
            req.user._id,
            req.params.id,
            req.body.consent
        );
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        if (err.code === "CONSENT_MISSING") {
            // Re-render the booking form with the validation error
            const course    = await CourseModel.findById(req.params.id);
            const sessions  = await SessionModel.listByCourse(course._id);
            const now       = new Date();
            const allSessions = _sessionRows(sessions, now);

            return res.status(400).render("course_book", {
                title:         `Book: ${course.title}`,
                course:        _courseShape(course),
                sessions:      allSessions,
                sessionsCount: allSessions.filter((s) => !s.isPast).length,
                user:          { id: req.user._id, name: req.user.name, email: req.user.email },
                errors:        { list: [err.message] },
                notes:         req.body.notes,
            });
        }
        res.status(400).render("error", { title: "Booking failed", message: err.message });
    }
};

export const getBookSessionPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course)
            return res.status(404).render("error", { title: "Not found", message: "Course not found" });

        if (!course.allowDropIn)
            return res.status(400).render("error", { title: "Not allowed", message: "Drop-ins are not enabled for this course." });

        const sessions = await SessionModel.listByCourse(course._id);
        const now = new Date();

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

        res.render("session_book", {
            title:    `Drop-in: ${course.title}`,
            course:   _courseShape(course),
            sessions: rows,
            user:     { id: req.user._id, name: req.user.name, email: req.user.email },
        });
    } catch (err) {
        next(err);
    }
};

export const postBookSession = async (req, res, next) => {
    try {
        const booking = await handleBookSessions(req.user._id, req.body.sessionIds);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        if (err.code === "NO_SESSIONS") {
            return res.status(400).render("error", { title: "Booking failed", message: err.message });
        }
        const message =
            err.code === "DROPIN_NOT_ALLOWED"
                ? "Drop-ins are not allowed for this course."
                : err.message;
        res.status(400).render("error", { title: "Booking failed", message });
    }
};

export const getSingleSessionBookPage = async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session)
            return res.status(404).render("error", { title: "Not Found", message: "Session not found." });

        const course = await CourseModel.findById(session.courseId);
        if (!course)
            return res.status(404).render("error", { title: "Not Found", message: "Course not found." });

        if (!course.allowDropIn)
            return res.status(400).render("error", { title: "Not Allowed", message: "Drop-ins are disabled for this course." });

        const now = new Date();
        const remaining = Math.max(0, (session.capacity ?? 0) - (session.bookedCount ?? 0));

        res.render("session_book", {
            title:  "Book Session",
            course: _courseShape(course),
            sessions: [{
                id:              String(session._id),
                start:           fmtDate(session.startDateTime),
                remaining,
                isFull:          remaining === 0,
                pluralRemaining: remaining !== 1,
                isPast:          new Date(session.startDateTime) < now,
            }],
            user: req.user
                ? { id: req.user._id, name: req.user.name, email: req.user.email }
                : null,
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// My Bookings & confirmation pages
// ---------------------------------------------------------------------------

export const myBookingsPage = async (req, res, next) => {
    try {
        const raw    = await BookingModel.listByUser(req.user._id);
        const active = raw.filter((b) => b.status !== "CANCELLED");

        const bookings = await Promise.all(
            active.map(async (b) => {
                const sessionData   = await Promise.all((b.sessionIds || []).map((sid) => SessionModel.findById(sid)));
                const validSessions = sessionData.filter(Boolean);
                const now           = new Date();

                const upcoming = validSessions
                    .filter((s) => new Date(s.startDateTime) >= now)
                    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

                const nextSession = upcoming[0] ? fmtDate(upcoming[0].startDateTime) : "No upcoming sessions";

                let courseTitle = "Unknown Course";
                let location    = "TBA";
                const first     = validSessions[0];
                if (first?.courseId) {
                    const course = await CourseModel.findById(first.courseId);
                    if (course) { courseTitle = course.title; location = course.location; }
                }

                return {
                    id:           String(b._id),
                    type:         fmtType(b.type),
                    status:       b.status,
                    createdAt:    b.createdAt ? fmtDateOnly(b.createdAt) : "",
                    sessionCount: validSessions.length,
                    nextSession,
                    courseTitle,
                    location,
                };
            })
        );

        res.render("my_bookings", {
            title:       "My Bookings",
            bookings,
            hasBookings: bookings.length > 0,
            user: {
                id:           String(req.user._id),
                name:         req.user.name,
                userInitials: req.user.userInitials,
                image:        req.user.image,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const bookingConfirmationPage = async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.bookingId);
        if (!booking)
            return res.status(404).render("error", { title: "Not found", message: "Booking not found" });

        const sessionData = await Promise.all(
            (booking.sessionIds || []).map((sid) => SessionModel.findById(sid))
        );

        const sessions = sessionData.filter(Boolean).map((s) => ({
            id:        String(s._id),
            bookingId: String(booking._id),
            start:     fmtDate(s.startDateTime),
            end:       fmtTimeOnly(s.endDateTime),
        }));

        const status   = req.query.status || booking.status;
        const returnTo = req.query.returnTo ? decodeURIComponent(req.query.returnTo) : "/profile";

        res.render("booking_confirmation", {
            title: "Booking confirmation",
            booking: {
                id:        String(booking._id),
                type:      booking.type,
                status,
                createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
            },
            sessions,
            isCancelled: status === "CANCELLED",
            isUpdated:   status === "UPDATED",
            returnTo,
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Cancellation pages
// ---------------------------------------------------------------------------

export const getCancelBookingPage = async (req, res, next) => {
    try {
        const { bookingId }    = req.params;
        const targetSessionId  = req.query.session || null;

        const booking = await BookingModel.findById(bookingId);
        if (!booking)
            return res.status(404).render("error", { title: "Not found", message: "Booking not found" });

        if (booking.userId.toString() !== req.user._id.toString())
            return res.status(403).render("error", { title: "Access denied", message: "You can only manage your own bookings." });

        if (booking.status === "CANCELLED")
            return res.redirect(`/bookings/${bookingId}`);

        const sessionData = await Promise.all(
            (booking.sessionIds || []).map((sid) => SessionModel.findById(sid))
        );

        const sessions = sessionData.filter(Boolean).map((s) => ({
            id:       String(s._id),
            start:    fmtDate(s.startDateTime),
            end:      fmtTimeOnly(s.endDateTime),
            isTarget: targetSessionId ? String(s._id) === targetSessionId : true,
        }));

        res.render("cancel_booking", {
            title: targetSessionId ? "Cancel Session" : "Cancel Booking",
            booking: {
                id:        booking._id,
                type:      booking.type,
                status:    booking.status,
                createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
            },
            sessions,
            isSingleSession: !!targetSessionId,
            targetSessionId,
        });
    } catch (err) {
        next(err);
    }
};

export const postCancelBooking = async (req, res, next) => {
    try {
        const booking  = await handleCancelBooking(req.params.bookingId, req.user._id);
        const returnTo = req.body.returnTo || "/";
        res.redirect(
            `/bookings/${booking._id}?status=CANCELLED&returnTo=${encodeURIComponent(returnTo)}`
        );
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : 500;
        res.status(status).render("error", { title: "Error", message: err.message });
    }
};

export const postCancelSession = async (req, res, next) => {
    try {
        const bookingId = await handleCancelSession(
            req.params.bookingId,
            req.params.sessionId,
            req.user._id
        );
        res.redirect(`/bookings/${bookingId}?status=UPDATED`);
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : 500;
        res.status(status).render("error", { title: "Error", message: err.message });
    }
};

// ---------------------------------------------------------------------------
// Schedule page
// ---------------------------------------------------------------------------

export const schedulePage = async (req, res, next) => {
    try {
        const showMyBookings = req.query.my === "1";
        const courses        = await CourseModel.list();
        const courseMap      = Object.fromEntries(courses.map((c) => [String(c._id), c]));

        const rawSessions = (
            await Promise.all(courses.map((c) => SessionModel.listByCourse(c._id)))
        ).flat();

        const allSessions = Array.from(
            new Map(rawSessions.map((s) => [String(s._id), s])).values()
        );

        let bookedSessionIds   = new Set();
        let bookingBySessionId = {};

        if (req.user) {
            const bookings = await BookingModel.listByUser(req.user._id);
            for (const b of bookings) {
                if (b.status === "CANCELLED") continue;
                for (const sid of b.sessionIds ?? []) {
                    const key = String(sid);
                    bookedSessionIds.add(key);
                    bookingBySessionId[key] = String(b._id);
                }
            }
        }

        const now = new Date();
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
                location:    course.location,
                canBook:     course.allowDropIn,
                spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
                isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
                isBooked,
                bookingId:   isBooked ? bookingBySessionId[sIdStr] : null,
                showMyBookings,
            });
        }

        const weeks = Array.from(weekMap.entries())
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([, week]) => {
                const days = [];
                for (let i = 0; i < 7; i++) {
                    const d   = new Date(week.monday);
                    d.setDate(d.getDate() + i);
                    const key = d.toDateString();
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

        res.render("schedule", {
            title: "Schedule",
            weeks,
            showMyBookings,
            user: req.user
                ? { id: String(req.user._id), name: req.user.name, userInitials: req.user.userInitials, image: req.user.image }
                : null,
        });
    } catch (err) {
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Admin / organiser dashboard pages
// ---------------------------------------------------------------------------

export const adminDashboardPage = async (req, res, next) => {
    try {
        const data = await getAdminDashboardData();
        res.render("adminDashboard", { title: "Admin Dashboard", ...data });
    } catch (err) { next(err); }
};

export const coursesDashboardPage = async (req, res, next) => {
    try {
        const data = await getCoursesDashboardData();
        res.render("coursesDashboard", { title: "Manage Courses", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

export const postCreateCoursePage = async (req, res, next) => {
    try {
        await createCourse(req.body);
        res.redirect("/dashboard/courses?success=created");
    } catch (err) { next(err); }
};

export const postDeleteCoursePage = async (req, res, next) => {
    try {
        await deleteCourse(req.params.id);
        res.redirect("/dashboard/courses?success=deleted");
    } catch (err) { next(err); }
};

export const postUpdateCoursePage = async (req, res, next) => {
    try {
        await updateCourse(req.params.id, req.body);
        res.redirect("/dashboard/courses?success=updated");
    } catch (err) { next(err); }
};

export const getUpdateCoursePage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course) return res.status(404).send("Course not found");

        const formattedCourse = {
            ...course,
            startDate: course.startDate ? new Date(course.startDate).toISOString().split("T")[0] : "",
            endDate:   course.endDate   ? new Date(course.endDate).toISOString().split("T")[0]   : "",
        };

        const { instructors } = await getCoursesDashboardData();
        res.render("updateCourse", { title: "Edit Course", course: formattedCourse, instructors });
    } catch (err) { next(err); }
};

export const classesDashboardPage = async (req, res, next) => {
    try {
        const data = await getClassesDashboardData();
        res.render("classesDashboard", { title: "Manage Classes", ...data });
    } catch (err) { next(err); }
};

export const classListDashboardPage = async (req, res, next) => {
    try {
        const data = await getClassListData(req.params.id);
        res.render("classListDashboard", { title: `Class List: ${data.course?.title || "Details"}`, ...data });
    } catch (err) { next(err); }
};

export const instructorsDashboardPage = async (req, res, next) => {
    try {
        const data = await getInstructorsData();
        if (req.query.success) data.success = req.query.success;
        res.render("instructorsDashboard", { title: "Manage Instructors", ...data });
    } catch (err) { next(err); }
};

export const postCreateInstructorPage = async (req, res, next) => {
    try {
        await createInstructor(req.body);
        res.redirect("/dashboard/instructors?success=Instructor added");
    } catch (err) { next(err); }
};

export const postDeleteInstructorPage = async (req, res, next) => {
    try {
        await deleteInstructor(req.params.id);
        res.redirect("/dashboard/instructors?success=Instructor removed");
    } catch (err) { next(err); }
};

export const organisersDashboardPage = async (req, res, next) => {
    try {
        const data = await getOrganisersData();
        res.render("organisersDashboard", { title: "Manage Organisers", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

export const postCreateOrganiserPage = async (req, res, next) => {
    try {
        await createOrganiser(req.body);
        res.redirect("/dashboard/organisers?success=Organiser added");
    } catch (err) { next(err); }
};

export const postDeleteOrganiserPage = async (req, res, next) => {
    try {
        await deleteOrganiser(req.params.id);
        res.redirect("/dashboard/organisers?success=Organiser removed");
    } catch (err) { next(err); }
};

export const usersDashboardPage = async (req, res, next) => {
    try {
        const data = await getUsersData();
        res.render("usersDashboard", { title: "Manage Users", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

export const postDeleteUserPage = async (req, res, next) => {
    try {
        await deleteUser(req.params.id);
        res.redirect("/dashboard/users?success=User removed");
    } catch (err) { next(err); }
};

// ---------------------------------------------------------------------------
// Session creation (proxied from routes)
// ---------------------------------------------------------------------------

/**
 * POST /sessions
 * Delegates to courseController.createSession.
 * Applies requireAuth for non-API callers.
 */
export const postCreateSession = (req, res, next) => {
    if (req.headers.accept?.includes("application/json")) {
        return createSession(req, res, next);
    }
    return requireAuth(req, res, () => createSession(req, res, next));
};

// ---------------------------------------------------------------------------
// Private shape helpers  (keep rendering logic DRY within this file)
// ---------------------------------------------------------------------------

function _courseShape(c) {
    return {
        id:          c._id,
        title:       c.title,
        level:       c.level,
        type:        fmtType(c.type),
        price:       c.price,
        allowDropIn: c.allowDropIn,
        location:    c.location,
        startDate:   c.startDate ? fmtDateOnly(c.startDate) : "",
        endDate:     c.endDate   ? fmtDateOnly(c.endDate)   : "",
        description: c.description,
    };
}

function _sessionRows(sessions, now) {
    return sessions.map((s) => ({
        id:        s._id,
        start:     fmtDate(s.startDateTime),
        remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
        isFull:    (s.bookedCount ?? 0) >= (s.capacity ?? 0),
        isPast:    new Date(s.startDateTime) < now,
    }));
}