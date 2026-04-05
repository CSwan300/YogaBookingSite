// controllers/authController.js
// Manages the user authentication web interface, including login, registration, and logout.
// Core validation and database operations are delegated to services/authService.js;
// session persistence is handled via signed HTTP-only cookies.

import * as authService from "../services/authService.js";

/**
 * Standard cookie configuration for the application.
 *
 * @type {import("express").CookieOptions}
 */
const COOKIE_OPTIONS = {
    httpOnly: true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: "lax",
    path: "/",
};

/**
 * Renders the login page.
 * Redirects to the home page if the user is already authenticated.
 *
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @returns {void}
 */
export const loginPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/login", { title: "Sign In" });
};

/**
 * Renders the registration page.
 * Redirects to the home page if the user is already authenticated.
 *
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @returns {void}
 */
export const registerPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/register", { title: "Create Account" });
};

/**
 * Handles login form submission.
 * Validates credentials via the auth service and sets the signed session cookie.
 *
 * @async
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export const postLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const { user, token } = await authService.authenticateUser(email, password);

        res.cookie("token", token, COOKIE_OPTIONS);

        if (user.role === "organiser") {
            return res.redirect("/dashboard");
        }

        res.redirect("/");
    } catch (err) {
        res.status(401).render("account/login", {
            title: "Sign In",
            error: err.message,
        });
    }
};

/**
 * Handles registration form submission.
 * Creates a new user account and sets the signed session cookie.
 *
 * @async
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @param {import("express").NextFunction} next - The Express next middleware function.
 * @returns {Promise<void>}
 */
export const postRegister = async (req, res, next) => {
    try {
        const { user, token } = await authService.registerUser(req.body);

        res.cookie("token", token, COOKIE_OPTIONS);
        res.redirect("/");
    } catch (err) {
        res.status(400).render("account/register", {
            title: "Create Account",
            error: err.message,
            name_value: req.body.name,
            email_value: req.body.email,
        });
    }
};

/**
 * Clears the session cookie and renders the logout confirmation page.
 * The cookie is cleared using the same relevant options used when setting it.
 *
 * @param {import("express").Request} req - The incoming Express request.
 * @param {import("express").Response} res - The outgoing Express response.
 * @returns {void}
 */
export const logoutHandler = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        signed: true,
        sameSite: "lax",
        path: "/",
    });

    res.render("logout", {
        title: "Signed Out",
        goodbye_message: "You have been successfully signed out. See you back on the mat soon!",
        login_url: "/login",
        home_url: "/",
        home_label: "Home",
    });
};