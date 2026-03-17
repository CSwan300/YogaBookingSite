// middlewares/auth.js
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * Runs on every request.
 * Reads the JWT from the signed cookie, verifies it, loads the user and attaches to:
 *   - req.user          → for use in controllers (e.g. bookings)
 *   - res.locals.user   → for use in Mustache templates
 */
export const attachSessionUser = async (req, res, next) => {
    try {
        const token = req.signedCookies?.token;
        if (!token) {
            req.user = null;
            res.locals.user = null;
            return next();
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await UserModel.findById(payload.userId);

        if (!user) {
            res.clearCookie("token");
            req.user = null;
            res.locals.user = null;
            return next();
        }

        req.user = user;
        res.locals.user = {
            id:          user._id,
            name:        user.name,
            role:        user.role,
            isStudent:   user.role === "student",
            isOrganiser: user.role === "organiser",
        };
        next();
    } catch (err) {
        // Invalid or expired token — clear it and continue as guest
        res.clearCookie("token");
        req.user = null;
        res.locals.user = null;
        next();
    }
};

/**
 * Protect a route — only allow logged-in users (any role).
 * Redirects to /login if not authenticated.
 */
export const requireAuth = (req, res, next) => {
    if (!req.user) return res.redirect("/login");
    next();
};

/**
 * Protect a route — only allow organisers.
 * Renders a 403 error page if not an organiser.
 */
export const requireOrganiser = (req, res, next) => {
    if (!req.user || req.user.role !== "organiser") {
        return res.status(403).render("error", {
            title: "Access denied",
            message: "You must be an organiser to access this page.",
        });
    }
    next();
};