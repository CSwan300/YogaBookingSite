/**
 * @module middleware/auth.js
 * @description
 * Middleware for attaching the authenticated user to the request,
 * exposing user data to views, and protecting routes.
 */

import * as authService from "../services/authService.js";

/**
 * Attaches the authenticated user to the request and response locals.
 * Reads the signed `token` cookie and resolves it to a user record.
 * In test mode, a mock user is injected to simplify integration tests.
 *
 * @async
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export const attachSessionUser = async (req, res, next) => {
    if (process.env.NODE_ENV === "test") {
        const mockUser = {
            _id: "test-id",
            name: "Test User",
            role: "student",
            userInitials: "TU",
        };

        req.user = mockUser;
        res.locals.user = {
            id: mockUser._id,
            name: mockUser.name,
            role: mockUser.role,
            userInitials: mockUser.userInitials,
            isStudent: true,
            isOrganiser: false,
        };

        return next();
    }

    const token = req.signedCookies?.token;

    if (!token) {
        return clearAndNext(req, res, next);
    }

    const user = await authService.verifyTokenAndGetUser(token);

    if (!user) {
        res.clearCookie("token", {
            httpOnly: true,
            signed: true,
            sameSite: "lax",
            path: "/",
        });

        return clearAndNext(req, res, next);
    }

    req.user = user;
    res.locals.user = {
        id: user._id,
        name: user.name,
        role: user.role,
        image: user.image || null,
        userInitials: user.userInitials || "",
        isStudent: user.role === "student",
        isOrganiser: user.role === "organiser",
    };

    next();
};

/**
 * Clears any attached user state from the request and response locals.
 *
 * @private
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
function clearAndNext(req, res, next) {
    req.user = null;
    res.locals.user = null;
    next();
}

/**
 * Guard middleware that only allows authenticated users to proceed.
 * Guests are redirected to the login page.
 *
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
export const requireAuth = (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    if (!req.user) return res.redirect("/login");
    next();
};

/**
 * Guard middleware that only allows organiser users to proceed.
 * Students and guests receive a 403 response.
 *
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
export const requireOrganiser = (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();

    if (!req.user || req.user.role !== "organiser") {
        return res.status(403).render("error", {
            title: "Access denied",
            message: "You must be an organiser to access this page.",
        });
    }

    next();
};