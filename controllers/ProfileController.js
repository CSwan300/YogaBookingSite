import { UserModel } from '../models/userModel.js';

// ─── GET /profile ────────────────────────────────────────────────────────────
export async function getProfile(req, res) {
    // .lean() makes the result a plain JS object instead of a Mongoose document
    const userDoc = await UserModel.findById(req.user._id).lean();
    if (!userDoc) return res.redirect('/login');

    const formatted = formatUser(userDoc);

    res.render('profile', {
        ...formatted,        // For the profile card: {{name}}, {{email}}
        user: formatted,     // For the header: {{user.role.isOrganiser}}
        pageTitle: 'My Profile',
    });
}

// ─── GET /profile/edit ───────────────────────────────────────────────────────
export async function getEditProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    const formatted = formatUser(user);

    res.render('profile-edit', {
        ...formatted,
        user: formatted,
        pageTitle: 'Edit Profile',
        errors: [],
    });
}

// ─── POST /profile/edit ──────────────────────────────────────────────────────
export async function postEditProfile(req, res) {
    const user = await UserModel.findById(req.user._id);
    if (!user) return res.redirect('/login');

    const { name, email } = req.body;
    const errors = validate({ name, email });

    const formatted = formatUser(user);

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

    if (email !== user.email) {
        const existing = await UserModel.findByEmail(email);
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

function formatUser(user) {
    // If user is a Mongoose document, convert to object; otherwise use as is
    const plainUser = user.toObject ? user.toObject() : user;

    return {
        ...plainUser,
        id: plainUser._id.toString(),
        // Ensure role exists so the template doesn't crash looking for .isOrganiser
        role: plainUser.role || {},
        createdAt: plainUser.createdAt
            ? new Date(plainUser.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : '—',
    };
}