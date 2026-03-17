// routes/sessions.js
import { Router } from "express";
import { SessionModel } from "../models/sessionModel.js";
import { requireOrganiser } from "../middlewares/auth.js";

const router = Router();

// ── Get all sessions for a course (public) ───────────────────
router.get("/by-course/:courseId", async (req, res, next) => {
    try {
        const sessions = await SessionModel.listByCourse(req.params.courseId);
        res.json({ sessions });
    } catch (err) {
        next(err);
    }
});

// ── Get a single session (public) ────────────────────────────
router.get("/:id", async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ error: "Session not found" });
        res.json({ session });
    } catch (err) {
        next(err);
    }
});

// ── Create a session (organiser only) ────────────────────────
router.post("/", requireOrganiser, async (req, res, next) => {
    try {
        const { courseId, startDateTime, endDateTime, capacity } = req.body;

        if (!courseId || !startDateTime || !endDateTime || !capacity) {
            return res.status(400).json({
                error: "courseId, startDateTime, endDateTime and capacity are required.",
            });
        }

        const session = await SessionModel.create({
            courseId,
            startDateTime,
            endDateTime,
            capacity: Number(capacity),
            bookedCount: 0,
        });

        res.status(201).json({ session });
    } catch (err) {
        next(err);
    }
});

// ── Update a session (organiser only) ────────────────────────
router.put("/:id", requireOrganiser, async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        const updated = await SessionModel.update(req.params.id, req.body);
        res.json({ session: updated });
    } catch (err) {
        next(err);
    }
});

// ── Delete a session (organiser only) ────────────────────────
router.delete("/:id", requireOrganiser, async (req, res, next) => {
    try {
        const session = await SessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        await SessionModel.delete(req.params.id);
        res.json({ message: "Session deleted." });
    } catch (err) {
        next(err);
    }
});

export default router;