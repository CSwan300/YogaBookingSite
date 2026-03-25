import { UserModel } from '../models/userModel.js';

// ─── GET /profile ────────────────────────────────────────────────────────────
// Show the current user's profile page.

export async function getProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    res.render('profile', {
        ...formatUser(user),
        pageTitle: 'My Profile',
    });
}

// ─── GET /profile/edit ───────────────────────────────────────────────────────
// Show the edit profile form, pre-filled with current values.

export async function getEditProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    res.render('profile-edit', {
        ...formatUser(user),
        pageTitle: 'Edit Profile',
        errors: [],
    });
}

// ─── POST /profile/edit ──────────────────────────────────────────────────────
// Validate and apply profile updates.

export async function postEditProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    const { name, email } = req.body;
    const errors = validate({ name, email });

    if (errors.length) {
        return res.render('profile-edit', {
            ...formatUser(user),
            // Keep whatever the user typed so the form doesn't reset
            name,
            email,
            pageTitle: 'Edit Profile',
            errors,
        });
    }

    // Check email uniqueness if it changed
    if (email !== user.email) {
        const existing = await UserModel.findByEmail(email);
        if (existing && String(existing._id) !== String(user._id)) {
            return res.render('profile-edit', {
                ...formatUser(user),
                name,
                email,
                pageTitle: 'Edit Profile',
                errors: [{ msg: 'That email address is already in use.' }],
            });
        }
    }

    await UserModel.update(user._id, { name, email });

    res.redirect('/profile');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// Formats a raw DB user object into template-friendly shape,
// including a formatted createdAt date.
function formatUser(user) {
    return {
        ...user,
        id: user._id,
        createdAt: user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : '—',
    };
}