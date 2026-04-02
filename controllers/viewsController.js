// controllers/viewsController.js
// Pure page-rendering layer. No business logic or formatting lives here.
// All data fetching and mutations are delegated to:
//   - services/courseService.js         (course / session data shapes)
//   - services/organiserService.js      (admin dashboard data)
//   - controllers/bookingController.js  (booking / cancellation logic)
//   - controllers/profileController.js  (profile view & edit)
//   - controllers/courseController.js   (session API creation)

import { BookingModel }  from "../models/bookingModel.js";
import { SessionModel }  from "../models/sessionModel.js";
import { CourseModel }   from "../models/courseModel.js";
import { userModel as UserModel } from "../models/userModel.js";
import { requireAuth }   from "../middlewares/auth.js";
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
    getClassesDashboardPageData,
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
} from "../services/organiserService.js";

import {
    getUpcomingCourseCards,
    getCourseDetail,
    getBookCourseData,
    getBookSessionData,
    getSingleSessionBookData,
    getScheduleWeeks,
} from "../services/courseService.js";

import { fmtDate, fmtDateOnly, fmtTimeOnly, fmtType } from "../services/formatService.js";

// Re-export profile handlers so routes only need one import target.
export { profilePage, getEditProfilePage, postEditProfile } from "./profileController.js";

// Re-export the courses list page handler.
export { listCourses };

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a course ID from an array of session IDs submitted in a form body.
 * Used when a POST route does not include a course ID in its URL params.
 *
 * @param {string|string[]} rawSessionIds - Raw value from req.body.sessionIds
 * @returns {Promise<string>} The courseId string
 * @throws If no session IDs are provided or the session cannot be found
 */
const resolveCourseIdFromSessions = async (rawSessionIds) => {
    const sessionIds = Array.isArray(rawSessionIds) ? rawSessionIds : [rawSessionIds];
    if (!sessionIds.length) throw new Error("No session IDs provided");

    const session = await SessionModel.findById(sessionIds[0]);
    if (!session) throw new Error("Session not found");

    return String(session.courseId);
};

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------

/**
 * GET /
 * Renders the home page with upcoming course cards.
 */
export const homePage = async (req, res, next) => {
    try {
        const cards = await getUpcomingCourseCards();
        res.render("home", { title: "Yoga Courses", courses: cards });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /about
 * Renders the static about page.
 */
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

/**
 * GET /instructors
 * Renders the instructors listing page.
 */
export const instructorsPage = async (req, res, next) => {
    try {
        const allUsers    = await UserModel.list();
        const instructors = allUsers
            .filter((u) => u.role === "instructor")
            .map((u) => ({
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

// ---------------------------------------------------------------------------
// Course pages
// ---------------------------------------------------------------------------

/**
 * GET /courses/:id
 * Renders the course detail page with session rows.
 */
export const courseDetailPage = async (req, res, next) => {
    try {
        const { course, sessions } = await getCourseDetail(req.params.id, req.user ?? null);
        res.render("course", {
            title: course.title,
            course,
            sessions,
            user: req.user
                ? { id: req.user._id, name: req.user.name, email: req.user.email }
                : null,
        });
    } catch (err) {
        if (err.code === "NOT_FOUND")
            return res.status(404).render("error", { title: "Not found", message: err.message });
        next(err);
    }
};

// ---------------------------------------------------------------------------
// Booking pages
// ---------------------------------------------------------------------------

/**
 * GET /courses/:id/book
 * Renders the full-course booking form.
 */
export const getBookCoursePage = async (req, res, next) => {
    try {
        const { course, sessions, sessionsCount } = await getBookCourseData(req.params.id);
        res.render("course_book", {
            title: `Book: ${course.title}`,
            course,
            sessions,
            sessionsCount,
            user: { id: req.user._id, name: req.user.name, email: req.user.email },
        });
    } catch (err) {
        if (err.code === "NOT_FOUND")
            return res.status(404).render("error", { title: "Not found", message: err.message });
        next(err);
    }
};

/**
 * POST /courses/:id/book
 * Processes a full-course booking for the logged-in user.
 * Re-renders the form with a validation error if:
 *   - consent checkbox is missing (CONSENT_MISSING)
 *   - the user already has an active booking for this course (ALREADY_BOOKED)
 */
export const postBookCourse = async (req, res, next) => {
    try {
        const booking = await handleBookCourse(req.user._id, req.params.id, req.body.consent);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        if (err.code === "CONSENT_MISSING" || err.code === "ALREADY_BOOKED") {
            const { course, sessions, sessionsCount } = await getBookCourseData(req.params.id);
            return res.status(err.code === "ALREADY_BOOKED" ? 409 : 400).render("course_book", {
                title:         `Book: ${course.title}`,
                course,
                sessions,
                sessionsCount,
                user:   { id: req.user._id, name: req.user.name, email: req.user.email },
                errors: { list: [err.message] },
                notes:  req.body.notes,
            });
        }

        res.status(400).render("error", { title: "Booking failed", message: err.message });
    }
};

/**
 * GET /courses/:id/book/sessions
 * Renders the drop-in session selector for a course.
 */
export const getBookSessionPage = async (req, res, next) => {
    try {
        const { course, sessions } = await getBookSessionData(req.params.id);
        res.render("session_book", {
            title:   `Drop-in: ${course.title}`,
            course,
            sessions,
            user: { id: req.user._id, name: req.user.name, email: req.user.email },
        });
    } catch (err) {
        if (err.code === "NOT_FOUND")
            return res.status(404).render("error", { title: "Not found", message: err.message });
        if (err.code === "DROPIN_NOT_ALLOWED")
            return res.status(400).render("error", { title: "Not allowed", message: err.message });
        next(err);
    }
};

/**
 * POST /bookings/sessions  (or whichever route handles drop-in submission)
 * Processes a drop-in session booking for the logged-in user.
 *
 * NOTE: This route does NOT have a course ID in its URL params. When re-rendering
 * is required (e.g. ALREADY_BOOKED), the course ID is derived from the submitted
 * session IDs via resolveCourseIdFromSessions().
 *
 * Re-renders the form with a validation error if:
 *   - no sessions were selected (NO_SESSIONS)
 *   - the user already holds one of the requested sessions (ALREADY_BOOKED)
 */
export const postBookSession = async (req, res, next) => {
    try {
        const booking = await handleBookSessions(req.user._id, req.body.sessionIds);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        if (err.code === "NO_SESSIONS")
            return res.status(400).render("error", { title: "Booking failed", message: err.message });

        if (err.code === "ALREADY_BOOKED") {
            // req.params.id is not available on this route — look up the courseId
            // from the first submitted sessionId instead.
            try {
                const courseId         = await resolveCourseIdFromSessions(req.body.sessionIds);
                const { course, sessions } = await getBookSessionData(courseId);
                return res.status(409).render("session_book", {
                    title:   `Drop-in: ${course.title}`,
                    course,
                    sessions,
                    user:   { id: req.user._id, name: req.user.name, email: req.user.email },
                    errors: { list: [err.message] },
                });
            } catch {
                // If we can't re-render the form, fall through to the generic error page.
                return res.status(409).render("error", { title: "Already booked", message: err.message });
            }
        }

        const message = err.code === "DROPIN_NOT_ALLOWED"
            ? "Drop-ins are not allowed for this course."
            : err.message;
        res.status(400).render("error", { title: "Booking failed", message });
    }
};

/**
 * GET /sessions/:id/book
 * Renders the booking form for a single drop-in session.
 */
export const getSingleSessionBookPage = async (req, res, next) => {
    try {
        const { course, sessions } = await getSingleSessionBookData(req.params.id);
        res.render("session_book", {
            title:  "Book Session",
            course,
            sessions,
            user: req.user
                ? { id: req.user._id, name: req.user.name, email: req.user.email }
                : null,
        });
    } catch (err) {
        if (err.code === "NOT_FOUND")
            return res.status(404).render("error", { title: "Not Found", message: err.message });
        if (err.code === "DROPIN_NOT_ALLOWED")
            return res.status(400).render("error", { title: "Not Allowed", message: err.message });
        next(err);
    }
};

// ---------------------------------------------------------------------------
// My Bookings & confirmation pages
// ---------------------------------------------------------------------------

/**
 * GET /bookings
 * Renders the logged-in user's active bookings list.
 */
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

/**
 * GET /bookings/:bookingId
 * Renders the booking confirmation / status page.
 */
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

/**
 * GET /bookings/:bookingId/cancel
 * Renders the booking (or single-session) cancellation confirmation page.
 * Accepts an optional `?session=<sessionId>` query param to target one session.
 */
export const getCancelBookingPage = async (req, res, next) => {
    try {
        const { bookingId }   = req.params;
        const targetSessionId = req.query.session || null;

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

/**
 * POST /bookings/:bookingId/cancel
 * Cancels an entire booking and redirects to the confirmation page.
 */
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

/**
 * POST /bookings/:bookingId/sessions/:sessionId/cancel
 * Removes a single session from a booking and redirects to the confirmation page.
 */
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

/**
 * GET /schedule
 * Renders the weekly session schedule.
 * Supports `?my=1` to filter to the logged-in user's own booked sessions.
 */
export const schedulePage = async (req, res, next) => {
    try {
        const showMyBookings = req.query.my === "1";

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

        const weeks = await getScheduleWeeks(bookedSessionIds, bookingBySessionId, showMyBookings);

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

/**
 * GET /dashboard
 * Renders the admin overview page with headline stats.
 */
export const adminDashboardPage = async (req, res, next) => {
    try {
        const data = await getAdminDashboardData();
        res.render("adminDashboard", { title: "Admin Dashboard", ...data });
    } catch (err) { next(err); }
};

/**
 * GET /dashboard/courses
 * Renders the courses management dashboard.
 */
export const coursesDashboardPage = async (req, res, next) => {
    try {
        const data = await getCoursesDashboardData();
        res.render("coursesDashboard", { title: "Manage Courses", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/courses
 * Creates a new course and redirects back to the dashboard.
 */
export const postCreateCoursePage = async (req, res, next) => {
    try {
        await createCourse(req.body);
        res.redirect("/dashboard/courses?success=created");
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/courses/:id/delete
 * Deletes a course and redirects back to the dashboard.
 */
export const postDeleteCoursePage = async (req, res, next) => {
    try {
        await deleteCourse(req.params.id);
        res.redirect("/dashboard/courses?success=deleted");
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/courses/:id/update
 * Updates a course and redirects back to the dashboard.
 */
export const postUpdateCoursePage = async (req, res, next) => {
    try {
        await updateCourse(req.params.id, req.body);
        res.redirect("/dashboard/courses?success=updated");
    } catch (err) { next(err); }
};

/**
 * GET /dashboard/courses/:id/edit
 * Renders the course edit form pre-populated with the existing course data.
 */
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
/**
 * GET /dashboard/classes
 * Renders the classes management dashboard with filtering.
 */
export const classesDashboardPage = async (req, res, next) => {
    try {
        const filterCourse = req.query.course || null;

        // Use the new service helper to get all data at once
        const viewModel = await getClassesDashboardPageData(filterCourse);

        res.render("classesDashboard", {
            title: "Manage Classes",
            ...viewModel
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /dashboard/classes/:id
 * Renders the class participant list for a given course or session ID.
 */
export const classListDashboardPage = async (req, res, next) => {
    try {
        const data = await getClassListData(req.params.id);
        res.render("classListDashboard", { title: `Class List: ${data.course?.title || "Details"}`, ...data });
    } catch (err) { next(err); }
};

/**
 * GET /dashboard/instructors
 * Renders the instructors management dashboard.
 */
export const instructorsDashboardPage = async (req, res, next) => {
    try {
        const data = await getInstructorsData();
        if (req.query.success) data.success = req.query.success;
        res.render("instructorsDashboard", { title: "Manage Instructors", ...data });
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/instructors
 * Creates a new instructor and redirects back to the dashboard.
 */
export const postCreateInstructorPage = async (req, res, next) => {
    try {
        await createInstructor(req.body);
        res.redirect("/dashboard/instructors?success=Instructor added");
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/instructors/:id/delete
 * Deletes an instructor and redirects back to the dashboard.
 */
export const postDeleteInstructorPage = async (req, res, next) => {
    try {
        await deleteInstructor(req.params.id);
        res.redirect("/dashboard/instructors?success=Instructor removed");
    } catch (err) { next(err); }
};

/**
 * GET /dashboard/organisers
 * Renders the organisers management dashboard.
 */
export const organisersDashboardPage = async (req, res, next) => {
    try {
        const data = await getOrganisersData();
        res.render("organisersDashboard", { title: "Manage Organisers", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/organisers
 * Creates a new organiser and redirects back to the dashboard.
 */
export const postCreateOrganiserPage = async (req, res, next) => {
    try {
        await createOrganiser(req.body);
        res.redirect("/dashboard/organisers?success=Organiser added");
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/organisers/:id/delete
 * Deletes an organiser and redirects back to the dashboard.
 */
export const postDeleteOrganiserPage = async (req, res, next) => {
    try {
        await deleteOrganiser(req.params.id);
        res.redirect("/dashboard/organisers?success=Organiser removed");
    } catch (err) { next(err); }
};

/**
 * GET /dashboard/users
 * Renders the students/users management dashboard.
 */
export const usersDashboardPage = async (req, res, next) => {
    try {
        const data = await getUsersData();
        res.render("usersDashboard", { title: "Manage Users", success: req.query.success, ...data });
    } catch (err) { next(err); }
};

/**
 * POST /dashboard/users/:id/delete
 * Deletes a student user and redirects back to the dashboard.
 */
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
 * Applies requireAuth middleware for non-API callers.
 */
export const postCreateSession = (req, res, next) => {
    if (req.headers.accept?.includes("application/json")) {
        return createSession(req, res, next);
    }
    return requireAuth(req, res, () => createSession(req, res, next));
};