// controllers/profileController.js
// Handles all user-profile page rendering and form submissions.

import { userModel as UserModel } from "../models/userModel.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Formats a raw DB user document for the view layer.
 * Ensures dates are human-readable and nested objects always exist.
 */
function formatUser(user) {
    if (!user) return {};
    const plain = user.toObject ? user.toObject() : user;
    return {
        ...plain,
        id:           plain._id ? plain._id.toString() : "",
        role:         plain.role || {},
        userInitials: plain.userInitials,
        image:        plain.image,
        createdAt:    plain.createdAt
            ? new Date(plain.createdAt).toLocaleDateString("en-GB", {
                day:   "2-digit",
                month: "short",
                year:  "numeric",
            })
            : "—",
    };
}

/**
 * Validates name and email fields from a profile-edit form.
 * Returns an array of { msg } error objects (empty = valid).
 */
function validateProfileFields({ name, email }) {
    const errors = [];
    if (!name || name.trim().length < 2)
        errors.push({ msg: "Name must be at least 2 characters." });
    if (name && name.trim().length > 80)
        errors.push({ msg: "Name must be 80 characters or fewer." });
    if (!email || !email.includes("@"))
        errors.push({ msg: "Please enter a valid email address." });
    return errors;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /profile
 */
export const profilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const formatted = formatUser(user);

        res.render("profile", {
            title: "My Profile",
            user:  formatted,   // used by header partials (e.g. role checks)
            ...formatted,       // spreads name, email, image, etc. for the card
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /profile/edit
 */
export const getEditProfilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const formatted = formatUser(user);

        res.render("account/profile-edit", {
            title:  "Edit Profile",
            user:   formatted,
            ...formatted,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /profile/edit
 */
export const postEditProfile = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const { name, email } = req.body;
        const errors   = validateProfileFields({ name, email });
        const formatted = formatUser(user);

        if (errors.length) {
            return res.status(400).render("account/profile-edit", {
                title:  "Edit Profile",
                user:   formatted,
                ...formatted,
                name,
                email,
                errors: { list: errors },
            });
        }

        // Check email uniqueness only when it has changed
        if (email.trim().toLowerCase() !== user.email) {
            const existing = await UserModel.findByEmail(email.trim().toLowerCase());
            if (existing && String(existing._id) !== String(user._id)) {
                return res.status(409).render("account/profile-edit", {
                    title:  "Edit Profile",
                    user:   formatted,
                    ...formatted,
                    name,
                    email,
                    errors: { list: [{ msg: "That email address is already in use." }] },
                });
            }
        }

        await UserModel.update(user._id, {
            name:  name.trim(),
            email: email.trim().toLowerCase(),
        });

        res.redirect("/profile");
    } catch (err) {
        next(err);
    }
};