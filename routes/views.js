import { Router } from "express";
import {
    homePage,
    listCourses,
    courseDetailPage,
    getBookCoursePage,
    getBookSessionPage,
    postBookCourse,
    postBookSession,
    postCancelBooking,
    postCancelSession,
    getCancelBookingPage,
    bookingConfirmationPage,
    myBookingsPage,
    schedulePage,
    instructorsPage,
    aboutPage,
    profilePage,
    getEditProfilePage,
    postEditProfile
} from "../controllers/viewsController.js";

import {
    loginPage,
    postLogin,
    logoutHandler,
    registerPage,
    postRegister
} from "../controllers/authController.js";

import { requireAuth } from "../middlewares/auth.js";
import adminRoutes from "./admin.js";

const router = Router();

/* ── Public Pages ───────────────────────────────────────────── */
router.get("/",            homePage);
router.get("/courses",     listCourses);
router.get("/courses/:id", courseDetailPage);
router.get("/schedule",    schedulePage);
router.get("/instructors", instructorsPage);
router.get("/about",       aboutPage);

/* ── Authentication ─────────────────────────────────────────── */
router.get("/login",       loginPage);
router.post("/login",      postLogin);
router.get("/register",    registerPage);
router.post("/register",   postRegister);
router.get("/logout",      logoutHandler);

/* ── Booking Features (Protected) ─────────────────────────── */
router.get("/courses/:id/book",         requireAuth, getBookCoursePage);
router.post("/courses/:id/book",        requireAuth, postBookCourse);
router.get("/courses/:id/book/session", requireAuth, getBookSessionPage);
router.post("/sessions/book",           requireAuth, postBookSession);
router.get("/bookings",                 requireAuth, myBookingsPage);
router.get("/bookings/:bookingId",      requireAuth, bookingConfirmationPage);
router.get("/bookings/:bookingId/cancel-confirm", requireAuth, getCancelBookingPage);
router.post("/bookings/:bookingId/cancel", requireAuth, postCancelBooking);
router.post("/bookings/:bookingId/sessions/:sessionId/cancel", requireAuth, postCancelSession);

/* ── Profile ───────────────────────────────────────────────── */
router.get("/profile",       requireAuth, profilePage);
router.get("/profile/edit",  requireAuth, getEditProfilePage);
router.post("/profile/edit", requireAuth, postEditProfile);

/* ── Mount Admin Routes ────────────────────────────────────── */
router.use(adminRoutes);

export default router;