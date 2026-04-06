import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, "../db");

// Create db directory synchronously before Datastores autoload
mkdirSync(dbDir, { recursive: true });

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

export async function initDb() {
    await fs.mkdir(dbDir, { recursive: true });

    const TEN_MINUTES = 10 * 60 * 1000;

    usersDb.setAutocompactionInterval(TEN_MINUTES);
    coursesDb.setAutocompactionInterval(TEN_MINUTES);
    sessionsDb.setAutocompactionInterval(TEN_MINUTES);
    bookingsDb.setAutocompactionInterval(TEN_MINUTES);

    await usersDb.ensureIndex({ fieldName: "email", unique: true });
    await sessionsDb.ensureIndex({ fieldName: "courseId" });
}

export async function closeDb() {
    const dbs = [usersDb, coursesDb, sessionsDb, bookingsDb];
    for (const db of dbs) {
        if (db && typeof db.stopAutocompaction === 'function') {
            try {
                db.stopAutocompaction();
            } catch (e) {
                if (db._autocompactionIntervalId) {
                    clearInterval(db._autocompactionIntervalId);
                    db._autocompactionIntervalId = null;
                }
            }
        }
    }
}