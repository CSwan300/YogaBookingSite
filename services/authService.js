/**
 * @typedef {Object} AuthResult
 * @property {Object} user - The full user document from the database
 * @property {string} token - The signed JSON Web Token
 */

import jwt from "jsonwebtoken";
import { userModel as UserModel } from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * Validates user existence by email and generates a session token.
 * @param {string} email - The user's login email
 * @returns {Promise<AuthResult>}
 * @throws {Error} If email is missing or user is not found
 */
export async function authenticateUser(email) {
    if (!email) throw new Error("Email is required.");

    const user = await UserModel.findByEmail(email.trim().toLowerCase());
    if (!user) throw new Error("No account found with that email.");

    const token = jwt.sign(
        { userId: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    return { user, token };
}

/**
 * Creates a new student account and returns a session token.
 * @param {Object} data - The registration form data
 * @param {string} data.name - Full name
 * @param {string} data.email - Unique email address
 * @param {string} data.password - User password
 * @param {string} data.confirm_password - Password confirmation
 * @returns {Promise<AuthResult>}
 * @throws {Error} If validation fails or email is taken
 */
export async function registerStudent(data) {
    const { name, email, password, confirm_password } = data;

    if (!name || !email || !password || !confirm_password) {
        throw new Error("All fields are required.");
    }

    if (password !== confirm_password) {
        throw new Error("Passwords do not match.");
    }

    const existing = await UserModel.findByEmail(email.trim().toLowerCase());
    if (existing) throw new Error("An account with that email already exists.");

    const user = await UserModel.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
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
 * Verifies a JWT and retrieves the corresponding user document.
 * @param {string} token - The signed JWT from cookies
 * @returns {Promise<Object|null>} The user document or null if invalid/expired
 */
export async function verifyTokenAndGetUser(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return await UserModel.findById(payload.userId);
    } catch (err) {
        return null;
    }
}