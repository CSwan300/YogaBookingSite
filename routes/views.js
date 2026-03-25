import { Router } from "express";
import {
    homePage,
    listCourses,
    courseDetailPage,
    getBookCoursePage,
    postBookCourse,
    postBookSession,
    postCancelBooking,
    bookingConfirmationPage,
    schedulePage,
    instructorsPage,
    aboutPage,
    profilePage,
    getEditProfilePage,
    postEditProfile,
} from "../controllers/viewsController.js";
import {
    loginPage,
    postLogin,
    logoutHandler,
    registerPage,
    postRegister,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// ── Auth ─────────────────────────────────────────────────────
router.get("/login",     loginPage);
router.post("/login",    postLogin);
router.get("/logout",    logoutHandler);
router.get("/register",  registerPage);
router.post("/register", postRegister);

// ── Public ────────────────────────────────────────────────────
router.get("/",            homePage);
router.get("/courses",     listCourses);
router.get("/courses/:id", courseDetailPage);
router.get("/schedule",    schedulePage);
router.get("/instructors", instructorsPage);
router.get("/about",       aboutPage);

// ── Registered Users Only ─────────────────────────────────────
// Profile
router.get("/profile",       requireAuth, profilePage);
router.get("/profile/edit",  requireAuth, getEditProfilePage);
router.post("/profile/edit", requireAuth, postEditProfile);

// Booking Actions
router.get("/courses/:id/book",  requireAuth, getBookCoursePage);
router.post("/courses/:id/book", requireAuth, postBookCourse);
router.post("/sessions/:id/book", requireAuth, postBookSession);

// Booking Management
router.get("/bookings/:bookingId",         requireAuth, bookingConfirmationPage);
router.post("/bookings/:bookingId/cancel", requireAuth, postCancelBooking);

export default router;