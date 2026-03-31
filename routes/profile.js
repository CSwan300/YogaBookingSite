// routes/profile.js
import { Router } from "express";
import { profilePage, getEditProfilePage, postEditProfile } from "../controllers/profileController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/profile",       requireAuth, profilePage);
router.get("/profile/edit",  requireAuth, getEditProfilePage);
router.post("/profile/edit", requireAuth, postEditProfile);

export default router;