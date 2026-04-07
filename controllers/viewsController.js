// controllers/viewsController.js
// Pure page-rendering layer. Every handler follows the same pattern:
//   1. Call a service function to get a fully-shaped view-model.
//   2. Call res.render() with that view-model.
//   3. Forward unexpected errors to next().
//
// No data formatting, no business logic, and no auth checks live here.
// Responsibilities are delegated to:
//   services/bookingViewService.js   — booking page view-models
//   services/courseViewService.js    — course edit page view-model
//   services/courseService.js        — course / session data shapes
//   services/organiserService.js     — admin dashboard data
//   controllers/bookingController.js — booking / cancellation mutations
//   controllers/sessionController.js — session creation / deletion
//   controllers/profileController.js — profile view & edit

import {
    getMyBookingsData,
    getBookingConfirmationData,
    getCancelBookingData,
    getUserScheduleBookings,
    resolveCourseIdFromSessions,
} from "../services/bookingViewService.js";

import { getEditCoursePageData } from "../services/courseViewService.js";

import {
    getUpcomingCourseCards,
    getCourseDetail,
    getBookCourseData,
    getBookSessionData,
    getSingleSessionBookData,
    getScheduleWeeks,
} from "../services/courseService.js";

import {
    getAdminDashboardData,
    getCoursesDashboardData,
    createCourse,
    deleteCourse,
    updateCourse,
    getClassesDashboardPageData,
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
    handleBookCourse,
    handleBookSessions,
    handleCancelBooking,
    handleCancelSession,
} from "./bookingController.js"

export {
  postCreateSession,
  postDeleteSession,
} from "./sessionController.js"

import { userModel as UserModel } from "../models/userModel.js";
import {postCreateSession} from "./sessionController.js";

// Re-export profile handlers so routes only need one import target.
export { profilePage, getEditProfilePage, postEditProfile } from "./profileController.js";

// Re-export the courses list page handler.
export { coursesListPage as listCourses } from "./coursesListController.js";

// ===========================================================================
// Public pages
// ===========================================================================

/**
 * Renders the home page with upcoming course cards.
 *
 * @route GET /
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
 * Renders the static about page.
 *
 * @route GET /about
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @returns {void}
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
 * Renders the public instructors listing page.
 * Filters the full user list to role === "instructor".
 *
 * @route GET /instructors
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
                image: u.image
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&size=128`,
            }));

        res.render("instructors", { title: "Our Instructors", instructors });
    } catch (err) {
        next(err);
    }
};

// ===========================================================================
// Course pages
// ===========================================================================

/**
 * Renders the public course detail page.
 *
 * @route GET /courses/:id
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not found", message: err.message });
        }
        next(err);
    }
};

// ===========================================================================
// Booking pages
// ===========================================================================

/**
 * Renders the full-course booking form.
 *
 * @route GET /courses/:id/book
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not found", message: err.message });
        }
        next(err);
    }
};

/**
 * Processes a full-course booking form submission.
 * On validation / duplicate errors, re-renders the form with error messages.
 * On success, redirects to the booking confirmation page.
 *
 * @route POST /courses/:id/book
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
 * Renders the drop-in session selection page for a course.
 *
 * @route GET /courses/:id/book/sessions
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const getBookSessionPage = async (req, res, next) => {
    try {
        const { course, sessions } = await getBookSessionData(req.params.id);
        res.render("session_book", {
            title:    `Drop-in: ${course.title}`,
            course,
            sessions,
            user: { id: req.user._id, name: req.user.name, email: req.user.email },
        });
    } catch (err) {
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not found", message: err.message });
        }
        if (err.code === "DROPIN_NOT_ALLOWED") {
            return res.status(400).render("error", { title: "Not allowed", message: err.message });
        }
        next(err);
    }
};

/**
 * Processes a drop-in session booking submission.
 * On conflict, re-renders the session selection form with error messages.
 * On success, redirects to the booking confirmation page.
 *
 * @route POST /bookings/sessions
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postBookSession = async (req, res, next) => {
    try {
        const booking = await handleBookSessions(req.user._id, req.body.sessionIds);
        res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
    } catch (err) {
        if (err.code === "NO_SESSIONS") {
            return res.status(400).render("error", { title: "Booking failed", message: err.message });
        }

        if (err.code === "ALREADY_BOOKED") {
            try {
                const courseId             = await resolveCourseIdFromSessions(req.body.sessionIds);
                const { course, sessions } = await getBookSessionData(courseId);
                return res.status(409).render("session_book", {
                    title:   `Drop-in: ${course.title}`,
                    course,
                    sessions,
                    user:    { id: req.user._id, name: req.user.name, email: req.user.email },
                    errors:  { list: [err.message] },
                });
            } catch {
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
 * Renders the single-session booking page (linked from the schedule).
 *
 * @route GET /sessions/:id/book
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not Found", message: err.message });
        }
        if (err.code === "DROPIN_NOT_ALLOWED") {
            return res.status(400).render("error", { title: "Not Allowed", message: err.message });
        }
        next(err);
    }
};

// ===========================================================================
// My Bookings & confirmation pages
// ===========================================================================

/**
 * Renders the authenticated user's active bookings list.
 *
 * @route GET /bookings
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const myBookingsPage = async (req, res, next) => {
    try {
        const { bookings, hasBookings } = await getMyBookingsData(req.user._id);
        res.render("my_bookings", {
            title: "My Bookings",
            bookings,
            hasBookings,
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
 * Renders the booking confirmation / status page.
 *
 * @route GET /bookings/:bookingId
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const bookingConfirmationPage = async (req, res, next) => {
    try {
        const returnTo = req.query.returnTo
            ? decodeURIComponent(req.query.returnTo)
            : "/profile";

        const viewModel = await getBookingConfirmationData(
            req.params.bookingId,
            req.query.status,
            returnTo,
        );

        res.render("booking_confirmation", { title: "Booking confirmation", ...viewModel });
    } catch (err) {
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not found", message: err.message });
        }
        next(err);
    }
};

// ===========================================================================
// Cancellation pages
// ===========================================================================

/**
 * Renders the cancellation confirmation form.
 * Authorisation (ownership check) is performed inside the service.
 * Already-cancelled bookings redirect straight to the confirmation page.
 *
 * @route GET /bookings/:bookingId/cancel
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const getCancelBookingPage = async (req, res, next) => {
    try {
        const { bookingId }     = req.params;
        const targetSessionId   = req.query.session || null;

        // Short-circuit if already cancelled — service would also catch this but
        // the redirect is a view concern so it stays here.
        const { booking, sessions, isSingleSession } = await getCancelBookingData(
            bookingId,
            req.user._id,
            targetSessionId,
        );

        if (booking.status === "CANCELLED") return res.redirect(`/bookings/${bookingId}`);

        res.render("cancel_booking", {
            title: targetSessionId ? "Cancel Session" : "Cancel Booking",
            booking,
            sessions,
            isSingleSession,
            targetSessionId,
        });
    } catch (err) {
        if (err.code === "NOT_FOUND") {
            return res.status(404).render("error", { title: "Not found", message: err.message });
        }
        if (err.code === "FORBIDDEN") {
            return res.status(403).render("error", { title: "Access denied", message: err.message });
        }
        next(err);
    }
};

/**
 * Processes a full booking cancellation.
 * Redirects to the confirmation page with status=CANCELLED on success.
 *
 * @route POST /bookings/:bookingId/cancel
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
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
 * Processes the cancellation of a single session within a booking.
 * Redirects to the confirmation page with status=UPDATED on success.
 *
 * @route POST /bookings/:bookingId/sessions/:sessionId/cancel
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postCancelSession = async (req, res, next) => {
    try {
        const bookingId = await handleCancelSession(
            req.params.bookingId,
            req.params.sessionId,
            req.user._id,
        );
        res.redirect(`/bookings/${bookingId}?status=UPDATED`);
    } catch (err) {
        const status = err.code === "NOT_FOUND" ? 404 : err.code === "FORBIDDEN" ? 403 : 500;
        res.status(status).render("error", { title: "Error", message: err.message });
    }
};

// ===========================================================================
// Schedule page
// ===========================================================================

/**
 * Renders the public schedule page.
 * When the user is authenticated, their booked sessions are marked on the schedule.
 * The `?my=1` query param filters the schedule down to the user's own bookings only.
 *
 * @route GET /schedule
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const schedulePage = async (req, res, next) => {
    try {
        const showMyBookings = req.query.my === "1";

        // Resolve booked session IDs for authenticated users.
        const { bookedSessionIds, bookingBySessionId } = req.user
            ? await getUserScheduleBookings(req.user._id)
            : { bookedSessionIds: new Set(), bookingBySessionId: {} };

        const weeks = await getScheduleWeeks(bookedSessionIds, bookingBySessionId, showMyBookings);

        res.render("schedule", {
            title: "Schedule",
            weeks,
            showMyBookings,
            user: req.user
                ? {
                    id:           String(req.user._id),
                    name:         req.user.name,
                    userInitials: req.user.userInitials,
                    image:        req.user.image,
                }
                : null,
        });
    } catch (err) {
        next(err);
    }
};

// ===========================================================================
// Admin / organiser dashboard pages
// ===========================================================================

/**
 * Renders the main admin dashboard.
 *
 * @route GET /dashboard
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const adminDashboardPage = async (req, res, next) => {
    try {
        const data = await getAdminDashboardData();
        res.render("adminDashboard", { title: "Admin Dashboard", ...data });
    } catch (err) { next(err); }
};

/**
 * Renders the courses management dashboard.
 *
 * @route GET /dashboard/courses
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const coursesDashboardPage = async (req, res, next) => {
    try {
        const data = await getCoursesDashboardData();
        res.render("coursesDashboard", {
            title:   "Manage Courses",
            success: req.query.success,
            ...data,
        });
    } catch (err) { next(err); }
};

/**
 * Processes a new course creation form submission.
 *
 * @route POST /dashboard/courses
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postCreateCoursePage = async (req, res, next) => {
    try {
        await createCourse(req.body);
        res.redirect("/dashboard/courses?success=created");
    } catch (err) { next(err); }
};

/**
 * Processes a course deletion request.
 *
 * @route POST /dashboard/courses/:id/delete
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postDeleteCoursePage = async (req, res, next) => {
    try {
        await deleteCourse(req.params.id);
        res.redirect("/dashboard/courses?success=deleted");
    } catch (err) { next(err); }
};

/**
 * Processes a course update form submission.
 *
 * @route POST /dashboard/courses/:id/update
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postUpdateCoursePage = async (req, res, next) => {
    try {
        await updateCourse(req.params.id, req.body);
        res.redirect("/dashboard/courses?success=updated");
    } catch (err) { next(err); }
};

/**
 * Renders the course edit form pre-populated with existing data.
 * View-model assembly (course flags, session rows, instructor list) is
 * handled by courseViewService.getEditCoursePageData.
 *
 * @route GET /dashboard/courses/:id/edit
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const getUpdateCoursePage = async (req, res, next) => {
    try {
        const viewModel = await getEditCoursePageData(req.params.id);
        res.render("updateCourse", { title: "Edit Course", ...viewModel });
    } catch (err) {
        if (err.code === "NOT_FOUND") return res.status(404).send(err.message);
        next(err);
    }
};

/**
 * Renders the classes (sessions) management dashboard.
 *
 * @route GET /dashboard/classes
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const classesDashboardPage = async (req, res, next) => {
    try {
        const viewModel = await getClassesDashboardPageData(req.query.course || null);
        res.render("classesDashboard", { title: "Manage Classes", ...viewModel });
    } catch (err) { next(err); }
};

/**
 * Renders the class-list detail page for a specific course.
 *
 * @route GET /dashboard/classes/:id
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const classListDashboardPage = async (req, res, next) => {
    try {
        const data = await getClassListData(req.params.id);
        res.render("classListDashboard", {
            title: `Class List: ${data.course?.title || "Details"}`,
            ...data,
        });
    } catch (err) { next(err); }
};

/**
 * Renders the instructors management dashboard.
 *
 * @route GET /dashboard/instructors
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const instructorsDashboardPage = async (req, res, next) => {
    try {
        const data = await getInstructorsData();
        if (req.query.success) data.success = req.query.success;
        res.render("instructorsDashboard", { title: "Manage Instructors", ...data });
    } catch (err) { next(err); }
};

/**
 * Processes a new instructor creation form submission.
 *
 * @route POST /dashboard/instructors
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postCreateInstructorPage = async (req, res, next) => {
    try {
        await createInstructor(req.body);
        res.redirect("/dashboard/instructors?success=Instructor added");
    } catch (err) { next(err); }
};

/**
 * Processes an instructor deletion request.
 *
 * @route POST /dashboard/instructors/:id/delete
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postDeleteInstructorPage = async (req, res, next) => {
    try {
        await deleteInstructor(req.params.id);
        res.redirect("/dashboard/instructors?success=Instructor removed");
    } catch (err) { next(err); }
};

/**
 * Renders the organisers management dashboard.
 *
 * @route GET /dashboard/organisers
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const organisersDashboardPage = async (req, res, next) => {
    try {
        const data = await getOrganisersData();
        res.render("organisersDashboard", {
            title:   "Manage Organisers",
            success: req.query.success,
            ...data,
        });
    } catch (err) { next(err); }
};

/**
 * Processes a new organiser creation form submission.
 *
 * @route POST /dashboard/organisers
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postCreateOrganiserPage = async (req, res, next) => {
    try {
        await createOrganiser(req.body);
        res.redirect("/dashboard/organisers?success=Organiser added");
    } catch (err) { next(err); }
};

/**
 * Processes an organiser deletion request.
 *
 * @route POST /dashboard/organisers/:id/delete
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postDeleteOrganiserPage = async (req, res, next) => {
    try {
        await deleteOrganiser(req.params.id);
        res.redirect("/dashboard/organisers?success=Organiser removed");
    } catch (err) { next(err); }
};

/**
 * Renders the users management dashboard.
 *
 * @route GET /dashboard/users
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const usersDashboardPage = async (req, res, next) => {
    try {
        const data = await getUsersData();
        res.render("usersDashboard", {
            title:   "Manage Users",
            success: req.query.success,
            ...data,
        });
    } catch (err) { next(err); }
};

/**
 * Processes a user deletion request.
 *
 * @route POST /dashboard/users/:id/delete
 * @param {import("express").Request}      req
 * @param {import("express").Response}     res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export const postDeleteUserPage = async (req, res, next) => {
    try {
        await deleteUser(req.params.id);
        res.redirect("/dashboard/users?success=User removed");
    } catch (err) { next(err); }
};