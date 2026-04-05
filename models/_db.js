// models/_db.js
import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, "../db");

/** @type {Datastore} Collection for user accounts and authentication. */
export const usersDb = Datastore.create({
    filename: path.join(dbDir, "users.db"),
    autoload: true,
});

/** @type {Datastore} Collection for course metadata. */
export const coursesDb = Datastore.create({
    filename: path.join(dbDir, "courses.db"),
    autoload: true,
});

/** @type {Datastore} Collection for individual class sessions/time slots. */
export const sessionsDb = Datastore.create({
    filename: path.join(dbDir, "sessions.db"),
    autoload: true,
});

/** @type {Datastore} Collection for user bookings and reservations. */
export const bookingsDb = Datastore.create({
    filename: path.join(dbDir, "bookings.db"),
    autoload: true,
});

/**
 * Initializes the database environment.
 * Creates the storage directory, sets up autocompaction to keep file sizes small,
 * and ensures necessary unique and performance indexes are created.
 * @async
 * @returns {Promise<void>}
 */
export async function initDb() {
    await fs.mkdir(dbDir, { recursive: true });

    const TEN_MINUTES = 10 * 60 * 1000;

    usersDb.setAutocompactionInterval(TEN_MINUTES);
    coursesDb.setAutocompactionInterval(TEN_MINUTES);
    sessionsDb.setAutocompactionInterval(TEN_MINUTES);
    bookingsDb.setAutocompactionInterval(TEN_MINUTES);

    // Indexes for performance and data integrity
    await usersDb.ensureIndex({ fieldName: "email", unique: true });
    await sessionsDb.ensureIndex({ fieldName: "courseId" });
}

/**
 * Gracefully shuts down database operations.
 * Specifically stops autocompaction intervals to prevent memory leaks
 * or hung processes during testing (e.g., with Jest).
 * @async
 * @returns {Promise<void>}
 */
export async function closeDb() {
    const dbs = [usersDb, coursesDb, sessionsDb, bookingsDb];
    for (const db of dbs) {
        if (db && typeof db.stopAutocompaction === 'function') {
            try {
                db.stopAutocompaction();
            } catch (e) {
                // Fallback: manually clear the interval if the proxy fails
                if (db._autocompactionIntervalId) {
                    clearInterval(db._autocompactionIntervalId);
                    db._autocompactionIntervalId = null;
                }
            }
        }
    }
}