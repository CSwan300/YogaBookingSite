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
                    price:         c.price,
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

/* ── List Courses ────────────────────────────────────────────── */
export const listCourses = async (req, res, next) => {
    try {
        const allCourses = await CourseModel.list();

        const { level, type, price, dropin, page: pageQuery } = req.query;

        let filtered = allCourses.filter(c => {
            const matchLevel = !level  || c.level.toLowerCase() === level.toLowerCase();
            const matchType  = !type   || c.type.toLowerCase().includes(type.toLowerCase());
            const matchPrice = !price  || c.price <= parseFloat(price);
            const matchDrop  = !dropin || String(c.allowDropIn) === dropin;
            return matchLevel && matchType && matchPrice && matchDrop;
        });

        const limit        = 9;
        const page         = parseInt(pageQuery) || 1;
        const totalCourses = filtered.length;
        const totalPages   = Math.ceil(totalCourses / limit);
        const offset       = (page - 1) * limit;
        const pagedCourses = filtered.slice(offset, offset + limit);

        const cards = await Promise.all(
            pagedCourses.map(async (c) => {
                const sessions = await SessionModel.listByCourse(c._id);
                return {
                    id:            c._id,
                    title:         c.title,
                    level:         c.level,
                    type:          fmtType(c.type),
                    price:         c.price,
                    dropInPrice:   c.dropInPrice || null,
                    allowDropIn:   c.allowDropIn,
                    startDate:     c.startDate ? fmtDateOnly(c.startDate) : "",
                    endDate:       c.endDate   ? fmtDateOnly(c.endDate)   : "",
                    nextSession:   sessions[0] ? fmtDate(sessions[0].startDateTime) : "TBA",
                    description:   c.description,
                };
            })
        );

        res.render("courses", {
            title: "Upcoming Courses",
            courses: cards,
            filters: { level, type, price, dropin },
            pagination: {
                current:     page,
                total:       totalPages,
                hasNext:     page < totalPages,
                hasPrev:     page > 1,
                nextPage:    page + 1,
                prevPage:    page - 1,
                queryParams: `&level=${level || ''}&type=${type || ''}&price=${price || ''}&dropin=${dropin || ''}`,
                pages: Array.from({ length: totalPages }, (_, i) => ({
                    number:    i + 1,
                    isCurrent: (i + 1) === page,
                })),
            },
        });
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
            courseId:    String(course._id),   // ← move it here
            start:       fmtDate(s.startDateTime),
            end:         fmtDate(s.endDateTime),
            duration:    duration(s.startDateTime, s.endDateTime),
            capacity:    s.capacity,
            booked:      s.bookedCount ?? 0,
            spotsLeft:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            remaining:   Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
            isFull:      (s.bookedCount ?? 0) >= (s.capacity ?? 0),
            upcoming:    new Date(s.startDateTime) >= now,
            allowDropIn: course.allowDropIn,
            dropInPrice: course.dropInPrice ?? null,
            user: req.user ? {
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
                price:         course.price,
                allowDropIn:   course.allowDropIn,
                startDate:     course.startDate ? fmtDateOnly(course.startDate) : "",
                endDate:       course.endDate   ? fmtDateOnly(course.endDate)   : "",
                description:   course.description,
                sessionsCount: sessions.length,
                courseId:    String(course._id),

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
export const myBookingsPage = async (req, res, next) => {
    try {
        const rawBookings = await BookingModel.listByUser(req.user._id);
        const activeBookings = rawBookings.filter(b => b.status !== "CANCELLED");

        const bookings = await Promise.all(
            activeBookings.map(async (b) => {
                const sessionData = await Promise.all(
                    (b.sessionIds || []).map(sid => SessionModel.findById(sid))
                );

                const validSessions = sessionData.filter(s => s !== null);

                const now = new Date();
                const upcoming = validSessions
                    .filter(s => new Date(s.startDateTime) >= now)
                    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

                const nextSession = upcoming[0]
                    ? fmtDate(upcoming[0].startDateTime)
                    : "No upcoming sessions";

                const firstSession = validSessions[0];
                let courseTitle = "Unknown Course";
                if (firstSession?.courseId) {
                    const course = await CourseModel.findById(firstSession.courseId);
                    if (course) courseTitle = course.title;
                }

                return {
                    id:           String(b._id),
                    type:         fmtType(b.type),
                    status:       b.status,
                    createdAt:    b.createdAt ? fmtDateOnly(b.createdAt) : "",
                    sessionCount: validSessions.length,
                    nextSession,
                    courseTitle,
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
/* ── Book course page ───────────────────────────────────────── */
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
                price:       course.price,
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

/* ── Book course ────────────────────────────────────────────── */
export const postBookCourse = async (req, res, next) => {
    try {
        const { consent } = req.body;
        const errors = [];

        if (!consent) errors.push("You must agree to the booking terms & health disclaimer.");

        if (errors.length) {
            const course = await CourseModel.findById(req.params.id);
            const sessions = await SessionModel.listByCourse(course._id);
            const now = new Date();

            const upcomingSessions = sessions
                .filter(s => new Date(s.startDateTime) >= now)
                .map(s => ({
                    id:        s._id,
                    start:     fmtDate(s.startDateTime),
                    remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
                }));

            return res.status(400).render("course_book", {
                title: `Book: ${course.title}`,
                course: {
                    id:          course._id,
                    title:       course.title,
                    level:       course.level,
                    type:        fmtType(course.type),
                    price:       course.price,
                    allowDropIn: course.allowDropIn,
                    startDate:   course.startDate ? fmtDateOnly(course.startDate) : "",
                    endDate:     course.endDate   ? fmtDateOnly(course.endDate)   : "",
                    description: course.description,
                },
                sessions:      upcomingSessions,
                sessionsCount: upcomingSessions.length,
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

/* ── Book session ───────────────────────────────────────────── */
export const postBookSession = async (req, res, next) => {
    try {
        const sessionId = req.body.sessionId;
        if (!sessionId)
            return res.status(400).render("error", {
                title:   "Booking failed",
                message: "No session selected. Please choose a session and try again.",
            });

        const booking = await bookSessionForUser(req.user._id, sessionId);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        const message =
            err.code === "DROPIN_NOT_ALLOWED"
                ? "Drop-ins are not allowed for this course."
                : err.message;
        res.status(400).render("error", { title: "Booking failed", message });
    }
};

/* ── Cancel booking page (GET) ──────────────────────────────── */
// Handles two scenarios via query param:
//   /bookings/:bookingId/cancel-confirm              → cancel entire booking
//   /bookings/:bookingId/cancel-confirm?session=:sid → cancel single session
export const getCancelBookingPage = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const targetSessionId = req.query.session || null;

        const booking = await BookingModel.findById(bookingId);
        if (!booking)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Booking not found",
            });

        if (booking.userId.toString() !== req.user._id.toString())
            return res.status(403).render("error", {
                title:   "Access denied",
                message: "You can only manage your own bookings.",
            });

        if (booking.status === "CANCELLED")
            return res.redirect(`/bookings/${bookingId}`);

        // Fetch full session details for every session in the booking
        const sessionData = await Promise.all(
            (booking.sessionIds || []).map(sid => SessionModel.findById(sid))
        );

        const sessions = sessionData
            .filter(s => s !== null)
            .map(s => ({
                id:       String(s._id),
                start:    fmtDate(s.startDateTime),
                end:      fmtTimeOnly(s.endDateTime),
                // Mark only the targeted session so the template can highlight it
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

/* ── Cancel Single Session (POST) ───────────────────────────── */
export const postCancelSession = async (req, res, next) => {
    try {
        const { bookingId, sessionId } = req.params;
        const booking = await BookingModel.findById(bookingId);

        if (!booking)
            return res.status(404).render("error", { message: "Booking not found" });

        if (booking.userId.toString() !== req.user._id.toString())
            return res.status(403).render("error", { message: "Unauthorized" });

        await SessionModel.incrementBookedCount(sessionId, -1);
        await BookingModel.removeSession(bookingId, sessionId);

        res.redirect(`/bookings/${bookingId}?status=UPDATED`);
    } catch (err) {
        next(err);
    }
};

/* ── User Profile ───────────────────────────────────────────── */
export const profilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        res.render("profile", {
            title:        "My Profile",
            name:         user.name,
            email:        user.email,
            image:        user.image,
            userInitials: user.userInitials,
            createdAt:    user.createdAt ? fmtDateOnly(user.createdAt) : "N/A",
        });
    } catch (err) {
        next(err);
    }
};

/* ── Edit Profile (GET) ─────────────────────────────────────── */
export const getEditProfilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        res.render("account/profile-edit", {
            title:        "Edit Profile",
            name:         user.name,
            email:        user.email,
            image:        user.image,
            userInitials: user.userInitials,
        });
    } catch (err) {
        next(err);
    }
};

/* ── Edit Profile (POST) ────────────────────────────────────── */
export const postEditProfile = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const { name, email } = req.body;
        const errors = [];

        if (!name || name.trim().length < 2)
            errors.push({ msg: "Name must be at least 2 characters." });
        if (name && name.trim().length > 80)
            errors.push({ msg: "Name must be 80 characters or fewer." });
        if (!email || !email.includes("@"))
            errors.push({ msg: "Please enter a valid email address." });

        if (errors.length) {
            return res.status(400).render("account/profile-edit", {
                title:        "Edit Profile",
                name,
                email,
                image:        user.image,
                userInitials: user.userInitials,
                errors:       { list: errors },
            });
        }

        if (email.trim().toLowerCase() !== user.email) {
            const existing = await UserModel.findByEmail(email.trim().toLowerCase());
            if (existing && String(existing._id) !== String(user._id)) {
                return res.status(409).render("account/profile-edit", {
                    title:        "Edit Profile",
                    name,
                    email,
                    image:        user.image,
                    userInitials: user.userInitials,
                    errors:       { list: [{ msg: "That email address is already in use." }] },
                });
            }
        }

        await UserModel.update(user._id, {
            name:  name.trim(),
            email: email.trim().toLowerCase(),
        });

        res.redirect("/profile");
    } catch (err) {
        next(err);
    }
};

/* ── Cancel booking (POST) ──────────────────────────────────── */
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
        const courseMap = Object.fromEntries(courses.map(c => [String(c._id), c]));

        const rawSessions = (
            await Promise.all(courses.map(c => SessionModel.listByCourse(c._id)))
        ).flat();

        const allSessions = Array.from(new Map(rawSessions.map(s => [String(s._id), s])).values());

        let bookedSessionIds = new Set();
        let bookingBySessionId = {};

        if (req.user) {
            const bookings = await BookingModel.listByUser(req.user._id);
            for (const b of bookings) {
                if (b.status === "CANCELLED") continue;
                if (b.sessionIds && Array.isArray(b.sessionIds)) {
                    for (const sid of b.sessionIds) {
                        const sessionIdStr = String(sid);
                        bookedSessionIds.add(sessionIdStr);
                        bookingBySessionId[sessionIdStr] = String(b._id);
                    }
                }
            }
        }

        const sessions = showMyBookings
            ? allSessions.filter(s => bookedSessionIds.has(String(s._id)))
            : allSessions;

        const weekMap = new Map();

        for (const s of sessions) {
            const start = new Date(s.startDateTime);
            const course = courseMap[String(s.courseId)];
            if (!course) continue;

            const monday = new Date(start);
            monday.setHours(0, 0, 0, 0);
            monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
            const weekKey = monday.toISOString();

            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, { monday, days: new Map() });
            }

            const dayKey = start.toDateString();
            const week = weekMap.get(weekKey);
            if (!week.days.has(dayKey)) {
                week.days.set(dayKey, { date: start, sessions: [] });
            }

            const sIdStr = String(s._id);
            const isBooked = bookedSessionIds.has(sIdStr);

            week.days.get(dayKey).sessions.push({
                id:          sIdStr,
                start:       fmtTimeOnly(s.startDateTime),
                end:         fmtTimeOnly(s.endDateTime),
                duration:    duration(s.startDateTime, s.endDateTime),
                courseTitle: course.title,
                courseLevel: course.level,
                courseId:    String(course._id),
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
                    const d = new Date(week.monday);
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
                const weekEnd = new Date(week.monday.getTime() + 6 * 86400000)
                    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                return { label: `${weekStart} – ${weekEnd}`, days };
            });

        res.render("schedule", {
            title: "Schedule",
            weeks,
            showMyBookings,
            user: req.user ? {
                id:           String(req.user._id),
                name:         req.user.name,
                userInitials: req.user.userInitials,
                image:        req.user.image,
            } : null,
        });
    } catch (err) {
        next(err);
    }
};

/* ── Instructors ────────────────────────────────────────────── */
export const instructorsPage = async (req, res, next) => {
    try {
        const allUsers = await UserModel.list();

        const instructors = allUsers
            .filter(u => u.role === "instructor")
            .map(u => ({
                id:    u._id,
                name:  u.name,
                email: u.email,
                bio:   u.bio,
                image: u.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=128`,
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
            tagline:     "Find balance, build strength, breathe deeper",
            description: `Nestled in the heart of the city, our yoga studio offers a sanctuary for body, mind, and spirit. Blending ancient traditions with modern wellness practices, we guide you on a transformative journey toward flexibility, inner peace, and self-discovery.`,
            mission:     `Our mission is to empower every student to unlock their full potential through mindful movement and conscious breath. We create a welcoming space where beginners and experienced practitioners alike can grow, connect, and find their center.`,
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

/* ── Book session page (Drop-in) ────────────────────────────── */
export const getBookSessionPage = async (req, res, next) => {
    try {
        const course = await CourseModel.findById(req.params.id);
        if (!course) {
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Course not found",
            });
        }

        if (!course.allowDropIn) {
            return res.status(400).render("error", {
                title:   "Not allowed",
                message: "Drop-ins are not enabled for this course.",
            });
        }

        const sessions = await SessionModel.listByCourse(course._id);

        const rows = sessions.map(s => {
            const remaining = Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0));
            return {
                id:              String(s._id),
                start:           fmtDate(s.startDateTime),
                remaining,
                isFull:          remaining === 0,
                pluralRemaining: remaining !== 1,
            };
        });

        res.render("session_book", {
            title: `Drop-in: ${course.title}`,
            course: {
                id:          course._id,
                title:       course.title,
                level:       course.level,
                type:        fmtType(course.type),
                description: course.description,
            },
            sessions: rows,
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

/* ── Booking confirmation ────────────────────────────────────── */
export const bookingConfirmationPage = async (req, res, next) => {
    try {
        const booking = await BookingModel.findById(req.params.bookingId);
        if (!booking)
            return res.status(404).render("error", {
                title:   "Not found",
                message: "Booking not found",
            });

        const sessionData = await Promise.all(
            (booking.sessionIds || []).map(sid => SessionModel.findById(sid))
        );

        // Pass bookingId on each session so the template can build cancel-confirm links
        const sessions = sessionData
            .filter(s => s !== null)
            .map(s => ({
                id:        String(s._id),
                bookingId: String(booking._id),
                start:     fmtDate(s.startDateTime),
                end:       fmtTimeOnly(s.endDateTime),
            }));

        const status   = req.query.status || booking.status;
        const returnTo = req.query.returnTo
            ? decodeURIComponent(req.query.returnTo)
            : "/profile";

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