import { Router } from "express";
import {
    adminDashboardPage,
    coursesDashboardPage,
    getUpdateCoursePage,
    postCreateCoursePage,
    postDeleteCoursePage,
    postUpdateCoursePage,
    classesDashboardPage,
    classListDashboardPage,
    organisersDashboardPage,
    postCreateOrganiserPage,
    postDeleteOrganiserPage,
    instructorsDashboardPage,
    postCreateInstructorPage,
    postDeleteInstructorPage,
    usersDashboardPage,
    postDeleteUserPage
} from "../controllers/viewsController.js";
import { requireAuth, requireOrganiser } from "../middlewares/auth.js";

const router = Router();

// ── Dashboard Pages ──────────────────────────────────────────
router.get("/dashboard",                    requireAuth, requireOrganiser, adminDashboardPage);
router.get("/dashboard/courses",            requireAuth, requireOrganiser, coursesDashboardPage);
router.get("/dashboard/classes",            requireAuth, requireOrganiser, classesDashboardPage);
router.get("/dashboard/classlist/:id",      requireAuth, requireOrganiser, classListDashboardPage);
router.get("/dashboard/organisers",         requireAuth, requireOrganiser, organisersDashboardPage);
router.get("/dashboard/instructors",        requireAuth, requireOrganiser, instructorsDashboardPage);
router.get("/dashboard/users",              requireAuth, requireOrganiser, usersDashboardPage);

// ── Course Edit / Update ──
// This GET route displays the form with the current data
router.get("/dashboard/courses/:id/update",  requireAuth, requireOrganiser, getUpdateCoursePage);

// ── Admin Actions ────────────────────────────────────────────
router.post("/dashboard/courses",           requireAuth, requireOrganiser, postCreateCoursePage);
router.post("/dashboard/courses/:id/delete", requireAuth, requireOrganiser, postDeleteCoursePage);
router.post("/dashboard/courses/:id/update", requireAuth, requireOrganiser, postUpdateCoursePage);

router.post("/dashboard/organisers",        requireAuth, requireOrganiser, postCreateOrganiserPage);
router.post("/dashboard/organisers/:id/delete", requireAuth, requireOrganiser, postDeleteOrganiserPage);

// Instructor Actions
router.post("/dashboard/instructors",        requireAuth, requireOrganiser, postCreateInstructorPage);
router.post("/dashboard/instructors/:id/delete", requireAuth, requireOrganiser, postDeleteInstructorPage);

router.post("/dashboard/users/:id/delete",  requireAuth, requireOrganiser, postDeleteUserPage);

export default router;