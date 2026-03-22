// routes/views.js
import { Router } from "express";
import {
    homePage,
    courseDetailPage,
    getBookCoursePage,
    postBookCourse,
    postBookSession,
    postCancelBooking,
    bookingConfirmationPage,
    schedulePage,
    instructorsPage,
    aboutPage,
} from "../controllers/viewsController.js";
import {
    loginPage,
    postLogin,
    logoutHandler,
    registerPage,
    postRegister,
} from "../controllers/authController.js";
import { coursesListPage } from "../controllers/coursesListController.js";
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
router.get("/courses",     coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/schedule",    schedulePage);
router.get("/instructors", instructorsPage);
router.get("/about",       aboutPage);

// ── Registered users only ─────────────────────────────────────
router.get("/courses/:id/book",            requireAuth, getBookCoursePage);
router.post("/courses/:id/book",           requireAuth, postBookCourse);
router.post("/sessions/:id/book",          requireAuth, postBookSession);
router.post("/bookings/:bookingId/cancel", requireAuth, postCancelBooking);
router.get("/bookings/:bookingId",         requireAuth, bookingConfirmationPage);

export default router;