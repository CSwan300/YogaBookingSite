/**
 * @module services/profileService
 * @description
 * Business logic for profile management, including data formatting
 * and validation for profile updates.
 */

import { userModel as UserModel } from "../models/userModel.js";

/**
 * Formats a database user object for display in Handlebars views.
 * * @param {Object|null} user - The raw user document from MongoDB.
 * @returns {Object} Formatted user object with readable dates and helper properties.
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

/**
 * Validates name and email fields for profile updates.
 * Enforces email format containing '@' and a dot.
 * * @param {Object} fields - The fields to validate.
 * @param {string} fields.name - The user's name.
 * @param {string} fields.email - The user's email.
 * @returns {Array<{msg: string}>} Array of error objects; empty if valid.
 */
export function validateProfileFields({ name, email }) {
    const errors = [];

    if (!name || name.trim().length < 2)
        errors.push({ msg: "Name must be at least 2 characters." });

    if (name && name.trim().length > 80)
        errors.push({ msg: "Name must be 80 characters or fewer." });

    // Stronger Email Validation (must have @ and .)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push({ msg: "Please enter a valid email address with '@' and a dot." });
    }

    return errors;
}

/**
 * Updates user profile data in the database.
 * * @async
 * @param {Object} user - The currently logged-in user document.
 * @param {Object} fields - The new data to save.
 * @param {string} fields.name - Updated name.
 * @param {string} fields.email - Updated email.
 * @returns {Promise<void>}
 * @throws {Error} If the new email is already claimed by another user.
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