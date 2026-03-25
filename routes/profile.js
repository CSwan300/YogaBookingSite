// routes/profile.js
import { Router } from "express";
import {
    getProfile,
    getEditProfile,
    postEditProfile,
} from "../controllers/ProfileController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/profile",       requireAuth, getProfile);
router.get("/profile/edit",  requireAuth, getEditProfile);
router.post("/profile/edit", requireAuth, postEditProfile);

export default router;