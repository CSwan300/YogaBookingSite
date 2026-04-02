// services/profileService.js
// Business logic for user profile viewing and editing.
// Keeps validation and formatting out of the controller.

import { userModel as UserModel } from "../models/userModel.js";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Formats a raw DB user document into a view-ready shape.
 * Ensures dates are human-readable and all expected keys are present.
 *
 * @param {object|null} user - Raw user document from the DB
 * @returns {object}
 */
export function formatUser(user) {
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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates the name and email fields submitted via the profile-edit form.
 * Returns an array of error objects; an empty array means the input is valid.
 *
 * @param {{ name: string, email: string }} fields
 * @returns {{ msg: string }[]}
 */
export function validateProfileFields({ name, email }) {
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
// Mutations
// ---------------------------------------------------------------------------

/**
 * Persists a profile update for the given user.
 * Checks email uniqueness before writing (skips the check if the email is unchanged).
 * Throws a descriptive error if the new email is already taken by another account.
 *
 * @param {object} user               - The currently authenticated user document
 * @param {{ name: string, email: string }} fields
 * @returns {Promise<void>}
 */
export async function updateProfile(user, { name, email }) {
    const normalisedEmail = email.trim().toLowerCase();

    if (normalisedEmail !== user.email) {
        const existing = await UserModel.findByEmail(normalisedEmail);
        if (existing && String(existing._id) !== String(user._id)) {
            const err   = new Error("That email address is already in use.");
            err.code    = "EMAIL_TAKEN";
            throw err;
        }
    }

    await UserModel.update(user._id, {
        name:  name.trim(),
        email: normalisedEmail,
    });
}