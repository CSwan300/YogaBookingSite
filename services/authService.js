/**
 * @module services/authService
 * @description
 * Provides authentication-related business logic including
 * user registration, password verification, token creation,
 * and token-based user lookup.
 */

/**
 * @typedef {Object} AuthResult
 * @property {Object} user - The full user document from the database.
 * @property {string} token - The signed JSON Web Token for the session.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userModel as UserModel } from "../models/userModel.js";

/**
 * Secret used to sign JSON Web Tokens.
 *
 * @type {string}
 */
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * Cost factor used by bcrypt when hashing passwords.
 *
 * @type {number}
 */
const BCRYPT_ROUNDS = 12;

/**
 * Validates a user's email and password, then generates a session token.
 *
 * @async
 * @param {string} email - The user's email address.
 * @param {string} password - The user's plain-text password.
 * @returns {Promise<AuthResult>} The authenticated user and signed token.
 * @throws {Error} If required fields are missing or credentials are invalid.
 */
export async function authenticateUser(email, password) {
    if (!email) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");

    const normalisedEmail = email.trim().toLowerCase();
    const user = await UserModel.findByEmail(normalisedEmail);

    if (!user) {
        throw new Error("Invalid email or password.");
    }

    if (!user.passwordHash) {
        throw new Error("This account does not have a password set.");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
        throw new Error("Invalid email or password.");
    }

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    return { user, token };
}

/**
 * Creates a new student account with a securely hashed password,
 * then returns the created user and a signed session token.
 *
 * @async
 * @param {Object} data - The submitted registration form data.
 * @param {string} data.name - The user's full name.
 * @param {string} data.email - The user's unique email address.
 * @param {string} data.password - The user's chosen plain-text password.
 * @param {string} data.confirm_password - The user's repeated password confirmation.
 * @returns {Promise<AuthResult>} The created user and signed token.
 * @throws {Error} If validation fails or the email is already in use.
 */
export async function registerStudent(data) {
    const { name, email, password, confirm_password } = data;

    if (!name || !email || !password || !confirm_password) {
        throw new Error("All fields are required.");
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
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    return { user, token };
}

/**
 * Verifies a JWT and returns the matching user document.
 *
 * @async
 * @param {string} token - The signed JWT from the cookie.
 * @returns {Promise<Object|null>} The resolved user document, or null if invalid.
 */
export async function verifyTokenAndGetUser(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return await UserModel.findById(payload.userId);
    } catch (err) {
        return null;
    }
}