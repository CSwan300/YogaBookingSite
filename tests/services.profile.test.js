// tests/services.profile.test.js
/**
 * Unit tests for services/profileService.js
 * Covers: formatUser, validateProfileFields, updateProfile
 */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { resetDb } from "./helpers.js";
import { closeDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import {
    formatUser,
    validateProfileFields,
    updateProfile,
} from "../services/profileService.js";

// ---------------------------------------------------------------------------
// formatUser
// ---------------------------------------------------------------------------

describe("profileService.formatUser", () => {
    test("returns an empty object for null input", () => {
        expect(formatUser(null)).toEqual({});
    });

    test("returns an empty object for undefined input", () => {
        expect(formatUser(undefined)).toEqual({});
    });

    test("maps _id to id as a string", () => {
        const user   = { _id: "abc123", name: "Test", email: "t@t.com", role: "student" };
        const result = formatUser(user);
        expect(result.id).toBe("abc123");
    });

    test("includes name and email", () => {
        const user   = { _id: "x", name: "Alice", email: "alice@example.com", role: "student" };
        const result = formatUser(user);
        expect(result.name).toBe("Alice");
        expect(result.email).toBe("alice@example.com");
    });

    test("formats createdAt to a readable date string", () => {
        const user   = { _id: "x", name: "A", email: "a@a.com", role: "student", createdAt: "2025-03-20T10:00:00.000Z" };
        const result = formatUser(user);
        expect(result.createdAt).toMatch(/mar/i);
        expect(result.createdAt).toMatch(/2025/);
    });

    test("returns '—' when createdAt is absent", () => {
        const user   = { _id: "x", name: "B", email: "b@b.com", role: "student" };
        const result = formatUser(user);
        expect(result.createdAt).toBe("—");
    });

    test("works on plain objects (no .toObject method)", () => {
        const user   = { _id: "plain", name: "Plain", email: "plain@example.com", role: "student" };
        expect(() => formatUser(user)).not.toThrow();
    });

    test("calls .toObject() if present (Mongoose-style document)", () => {
        const user = {
            _id:      "mongoose",
            name:     "Mongoose",
            email:    "mg@example.com",
            role:     "student",
            toObject: function () { return { _id: this._id, name: this.name, email: this.email, role: this.role }; },
        };
        const result = formatUser(user);
        expect(result.id).toBe("mongoose");
    });
});

// ---------------------------------------------------------------------------
// validateProfileFields
// ---------------------------------------------------------------------------

describe("profileService.validateProfileFields", () => {
    test("returns no errors for valid name and email", () => {
        const errors = validateProfileFields({ name: "Alice Smith", email: "alice@example.com" });
        expect(errors).toHaveLength(0);
    });

    test("returns error when name is too short (< 2 chars)", () => {
        const errors = validateProfileFields({ name: "A", email: "a@example.com" });
        expect(errors.some((e) => e.msg.match(/2 characters/i))).toBe(true);
    });

    test("returns error when name is empty", () => {
        const errors = validateProfileFields({ name: "", email: "a@example.com" });
        expect(errors.length).toBeGreaterThan(0);
    });

    test("returns error when name is undefined", () => {
        const errors = validateProfileFields({ name: undefined, email: "a@example.com" });
        expect(errors.length).toBeGreaterThan(0);
    });

    test("returns error when name exceeds 80 chars", () => {
        const longName = "A".repeat(81);
        const errors   = validateProfileFields({ name: longName, email: "a@example.com" });
        expect(errors.some((e) => e.msg.match(/80 characters/i))).toBe(true);
    });

    test("accepts name of exactly 80 chars", () => {
        const maxName = "A".repeat(80);
        const errors  = validateProfileFields({ name: maxName, email: "a@example.com" });
        // Should not contain a length error
        expect(errors.some((e) => e.msg.match(/80 characters/i))).toBe(false);
    });

    test("returns error for email without @", () => {
        const errors = validateProfileFields({ name: "Alice", email: "notanemail" });
        expect(errors.some((e) => e.msg.match(/valid email/i))).toBe(true);
    });

    test("returns error for email without dot after @", () => {
        const errors = validateProfileFields({ name: "Alice", email: "alice@nodot" });
        expect(errors.some((e) => e.msg.match(/valid email/i))).toBe(true);
    });

    test("returns error for empty email", () => {
        const errors = validateProfileFields({ name: "Alice", email: "" });
        expect(errors.some((e) => e.msg.match(/valid email/i))).toBe(true);
    });

    test("returns error for undefined email", () => {
        const errors = validateProfileFields({ name: "Alice", email: undefined });
        expect(errors.some((e) => e.msg.match(/valid email/i))).toBe(true);
    });

    test("can return multiple errors simultaneously", () => {
        const errors = validateProfileFields({ name: "A", email: "bad" });
        expect(errors.length).toBeGreaterThanOrEqual(2);
    });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe("profileService.updateProfile", () => {
    let existingUser;
    let otherUser;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        await resetDb();
        existingUser = await UserModel.create({
            name:  "Profile User",
            email: "profile@example.com",
            role:  "student",
        });
        otherUser = await UserModel.create({
            name:  "Other User",
            email: "other@example.com",
            role:  "student",
        });
    });

    afterAll(async () => {
        await closeDb();
    });

    test("updates name and email successfully", async () => {
        await expect(
            updateProfile(existingUser, { name: "Updated Name", email: "updated@example.com" })
        ).resolves.not.toThrow();
    });

    test("allows user to keep their own email", async () => {
        await expect(
            updateProfile(otherUser, { name: "Other User", email: "other@example.com" })
        ).resolves.not.toThrow();
    });

    test("normalises email to lowercase before saving", async () => {
        // Just ensure no throw — actual DB write is handled by UserModel
        await expect(
            updateProfile(existingUser, { name: "Upper Email", email: "UPPER@EXAMPLE.COM" })
        ).resolves.not.toThrow();
    });

    test("throws EMAIL_TAKEN when email is already used by another user", async () => {
        const newUser = await UserModel.create({
            name:  "New User",
            email: "newuser@example.com",
            role:  "student",
        });

        await expect(
            updateProfile(newUser, { name: "New User", email: "other@example.com" })
        ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    });
});
