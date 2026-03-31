import jwt from "jsonwebtoken";
import { userModel as UserModel } from "../models/userModel.js";

const JWT_SECRET     = process.env.JWT_SECRET     || "dev-secret-change-me";
const COOKIE_OPTIONS = {
    httpOnly: true,
    signed:   true,               // CRITICAL: This signs the cookie for security
    maxAge:   1000 * 60 * 60 * 24, // 24 hours
    sameSite: "lax",
    path:     "/"                 // Ensures cookie is available site-wide
};

/* ── Login Page ── */
export const loginPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/login", { title: "Sign In" });
};

/* ── Login Logic ── */
export const postLogin = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).render("account/login", {
                title: "Sign In",
                error: "Email is required.",
            });
        }

        const user = await UserModel.findByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(401).render("account/login", {
                title: "Sign In",
                error: "No account found with that email.",
            });
        }

        // Create JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Set the signed cookie
        res.cookie("token", token, COOKIE_OPTIONS);

        if (user.role === "organiser") return res.redirect("/dashboard");
        res.redirect("/");
    } catch (err) {
        next(err);
    }
};

/* ── Logout Logic ── */
export const logoutHandler = (req, res) => {
    // We must pass the same 'signed' and 'path' options to clear it successfully
    res.clearCookie("token", {
        httpOnly: true,
        signed:   true,
        sameSite: "lax",
        path:     "/"
    });

    // Render the logout confirmation page
    res.render("logout", {
        title: "Signed Out",
        goodbye_message: "You have been successfully signed out. See you back on the mat soon!",
        login_url: "/login",
        home_url: "/",
        home_label: "Home"
    });
};

/* ── Register Page ── */
export const registerPage = (req, res) => {
    if (res.locals.user) return res.redirect("/");
    res.render("account/register", { title: "Create Account" });
};

/* ── Register Logic ── */
export const postRegister = async (req, res, next) => {
    try {
        const { name, email, password, confirm_password } = req.body;

        // Basic Validation
        if (!name || !email || !password || !confirm_password) {
            return res.status(400).render("account/register", {
                title: "Create Account",
                error: "All fields are required.",
                name_value: name,
                email_value: email,
            });
        }

        if (password !== confirm_password) {
            return res.status(400).render("account/register", {
                title: "Create Account",
                error: "Passwords do not match.",
                name_value: name,
                email_value: email,
            });
        }

        const existing = await UserModel.findByEmail(email.trim().toLowerCase());
        if (existing) {
            return res.status(409).render("account/register", {
                title: "Create Account",
                error: "An account with that email already exists.",
                name_value: name,
                email_value: email,
            });
        }

        const user = await UserModel.create({
            name:  name.trim(),
            email: email.trim().toLowerCase(),
            role:  "student",
        });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.cookie("token", token, COOKIE_OPTIONS);
        res.redirect("/");
    } catch (err) {
        next(err);
    }
};
