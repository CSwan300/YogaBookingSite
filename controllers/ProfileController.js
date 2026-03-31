import { userModel } from '../models/userModel.js';

/**
 * GET /profile
 * Displays the logged-in user's profile information.
 */
export async function getProfile(req, res) {
    // We look up the user by ID provided by the auth middleware (req.user)
    const userDoc = await userModel.findById(req.user._id);

    if (!userDoc) {
        return res.redirect('/login');
    }

    const formatted = formatUser(userDoc);

    res.render('profile', {
        ...formatted,        // Spreads name, email, image, etc. for the profile card
        user: formatted,     // Nested object for header logic (e.g., {{user.role.isOrganiser}})
        pageTitle: 'My Profile',
    });
}

/**
 * GET /profile/edit
 * Renders the form to update profile details.
 */
export async function getEditProfile(req, res) {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    const formatted = formatUser(user);

    res.render('profile-edit', {
        ...formatted,
        user: formatted,
        pageTitle: 'Edit Profile',
        errors: [],
    });
}

/**
 * POST /profile/edit
 * Handles the logic for updating user name and email.
 */
export async function postEditProfile(req, res) {
    const user = await userModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    const { name, email } = req.body;
    const errors = validate({ name, email });

    const formatted = formatUser(user);

    // If validation fails, re-render with existing data and error messages
    if (errors.length) {
        return res.render('profile-edit', {
            ...formatted,
            user: formatted,
            name,
            email,
            pageTitle: 'Edit Profile',
            errors,
        });
    }

    // Email Uniqueness Check: If email changed, ensure it's not taken by someone else
    if (email !== user.email) {
        const existing = await userModel.findByEmail(email);
        if (existing && String(existing._id) !== String(user._id)) {
            return res.render('profile-edit', {
                ...formatted,
                user: formatted,
                name,
                email,
                pageTitle: 'Edit Profile',
                errors: [{ msg: 'That email address is already in use.' }],
            });
        }
    }

    // Save changes to the database
    await userModel.update(user._id, { name, email });

    res.redirect('/profile');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simple validation for name and email fields.
 */
function validate({ name, email }) {
    const errors = [];
    if (!name || name.trim().length < 2) {
        errors.push({ msg: 'Name must be at least 2 characters.' });
    }
    if (name && name.trim().length > 80) {
        errors.push({ msg: 'Name must be 80 characters or fewer.' });
    }
    if (!email || !email.includes('@')) {
        errors.push({ msg: 'Please enter a valid email address.' });
    }
    return errors;
}

/**
 * Formats raw database objects for the View layer.
 * Ensures dates are readable and nested objects exist.
 */
function formatUser(user) {
    if (!user) return {};

    // Standardize object format (handles Mongoose or plain JSON)
    const plainUser = user.toObject ? user.toObject() : user;

    return {
        ...plainUser,
        id: plainUser._id ? plainUser._id.toString() : '',
        role: plainUser.role || {}, // Prevents "cannot read property isOrganiser of undefined"
        createdAt: plainUser.createdAt
            ? new Date(plainUser.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : '—',
    };
}
