// controllers/profileController.js
// Handles all user-profile page rendering and form submissions.
// Business logic (validation, DB writes) is delegated to services/profileService.js.

import { formatUser, validateProfileFields, updateProfile } from "../services/profileService.js";

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /profile
 * Renders the user profile page for the currently authenticated user.
 */
export const profilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const formatted = formatUser(user);

        res.render("profile", {
            title: "My Profile",
            user:  formatted,
            ...formatted,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /profile/edit
 * Renders the profile edit form pre-populated with the user's current data.
 */
export const getEditProfilePage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const formatted = formatUser(user);

        res.render("account/profile-edit", {
            title: "Edit Profile",
            user:  formatted,
            ...formatted,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /profile/edit
 * Validates form input and persists the updated name/email.
 * Re-renders the form with errors on failure; redirects to /profile on success.
 */
export const postEditProfile = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) return res.redirect("/login");

        const { name, email } = req.body;
        const errors          = validateProfileFields({ name, email });
        const formatted       = formatUser(user);

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

        try {
            await updateProfile(user, { name, email });
        } catch (err) {
            if (err.code === "EMAIL_TAKEN") {
                return res.status(409).render("account/profile-edit", {
                    title:  "Edit Profile",
                    user:   formatted,
                    ...formatted,
                    name,
                    email,
                    errors: { list: [{ msg: err.message }] },
                });
            }
            throw err;
        }

        res.redirect("/profile");
    } catch (err) {
        next(err);
    }
};