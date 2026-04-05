/**
 * @module services/authService
 * @description
 * Handles authentication business logic, including user registration with
 * strong validation and credential verification.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userModel as UserModel } from "../models/userModel.js";
import { env } from "../utils/env.js";

/** @type {number} */
const BCRYPT_ROUNDS = 12;

/**
 * @typedef {Object} AuthResult
 * @property {Object} user - The full user document from the database.
 * @property {string} token - The signed JSON Web Token for the session.
 */

/**
 * Validates credentials and generates a session token.
 * * @async
 * @param {string} email - The user's email address.
 * @param {string} password - The user's plain-text password.
 * @returns {Promise<AuthResult>} The authenticated user and signed token.
 * @throws {Error} If credentials are missing or invalid.
 */
export async function authenticateUser(email, password) {
    if (!email) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");

    const normalisedEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(normalisedEmail);

    if (!user) throw new Error("Invalid email or password.");
    if (!user.passwordHash) throw new Error("This account does not have a password set.");

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) throw new Error("Invalid email or password.");

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    return { user, token };
}

/**
 * Registers a new student with strong input validation.
 * Enforces:
 * - Email: Must contain '@' and a '.'
 * - Password: Minimum 8 characters and at least one number.
 * * @async
 * @param {Object} data - The registration form data.
 * @param {string} data.name - Full name of the user.
 * @param {string} data.email - User email address.
 * @param {string} data.password - Chosen password.
 * @param {string} data.confirm_password - Password confirmation.
 * @returns {Promise<AuthResult>} The created user and session token.
 * @throws {Error} If validation fails or email is taken.
 */
export async function registerStudent(data) {
    const { name, email, password, confirm_password } = data;

    if (!name || !email || !password || !confirm_password) {
        throw new Error("All fields are required.");
    }

    // Email validation: matches 'xxx@xxx.xxx'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("Please enter a valid email address (e.g., name@example.com).");
    }

    // Password validation: 8+ chars and at least one digit
    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }
    if (!/\d/.test(password)) {
        throw new Error("Password must contain at least one number.");
    }

    if (password !== confirm_password) {
        throw new Error("Passwords do not match.");
    }

    const normalisedEmail = email.trim().toLowerCase();
    const existing = await UserModel.findByEmail(normalisedEmail);

    if (existing) {
        throw new Error("An account with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await UserModel.create({
        name: name.trim(),
        email: normalisedEmail,
        passwordHash,
        role: "student",
    });

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    return { user, token };
}

/**
 * Verifies a JWT and returns the associated user.
 * * @async
 * @param {string} token - The JWT from the request cookies.
 * @returns {Promise<Object|null>} The user document or null if invalid.
 */
export async function verifyTokenAndGetUser(token) {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET);
        return await UserModel.findById(payload.userId);
    } catch (err) {
        return null;
    }
}