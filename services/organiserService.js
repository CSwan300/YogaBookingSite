// services/organiserService.js
// Data-fetching and mutation logic for the organiser/admin dashboard.
// Controllers call these functions and handle the HTTP response.

import { CourseModel }  from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { userModel }    from "../models/userModel.js";
import {
    fmtDate,
    fmtDateTime,
    } from "./formatService.js";
// ---------------------------------------------------------------------------
// Dashboard data
// ---------------------------------------------------------------------------

/**
 * Returns headline counts for the admin overview page.
 *
 * @returns {Promise<{ courseCount: number, userCount: number, bookingCount: number }>}
 */
export const getAdminDashboardData = async () => {
    const [courses, users, bookings] = await Promise.all([
        CourseModel.list(),
        userModel.list(),
        BookingModel.list(),
    ]);

    return {
        courseCount:  courses.length,
        userCount:    users.length,
        bookingCount: bookings.filter((b) => String(b.status).toUpperCase() !== "CANCELLED").length,
    };
};

/**
 * Returns all courses and instructors for the courses management dashboard.
 *
 * @returns {Promise<{ courses: object[], instructors: object[] }>}
 */
export const getCoursesDashboardData = async () => {
    const [courses, allUsers] = await Promise.all([
        CourseModel.list(),
        userModel.list(),
    ]);

    return {
        courses,
        instructors: allUsers.filter((u) => u.role === "instructor"),
    };
};
/**
 * Orchestrates all data required for the Manage Classes dashboard page.
 */
export const getClassesDashboardPageData = async (filterCourse = null) => {
    // 1. Get the filtered sessions (using the logic we wrote earlier)
    const { sessions } = await getClassesDashboardData(filterCourse);

    // 2. Get the unique list of courses for the dropdown
    const allCourses = await CourseModel.list();
    const uniqueCourses = [...new Set(allCourses.map(c => c.title))].sort();

    return {
        sessions,
        uniqueCourses,
        selectedCourse: filterCourse
    };
};
/**
 * Fetches and enriches all sessions with their parent course data for the
 * admin classes dashboard. Supports optional filtering by course title.
 *
 * @param {string|null} [filterCourse=null] - The title of the course to filter sessions by.
 * @returns {Promise<{ sessions: Array<{
 * id: string,
 * courseTitle: string,
 * courseLevel: string,
 * start: string,
 * capacity: number,
 * bookedCount: number
 * }> }>} An object containing the array of enriched, sorted session objects.
 */
export const getClassesDashboardData = async (filterCourse = null) => {
    const courses = await CourseModel.list();
    const courseMap = Object.fromEntries(courses.map(c => [String(c._id), c]));


    let sessions = [];


    if (filterCourse) {

        const targetCourses = courses.filter(c => c.title === filterCourse);
        const targetIds = targetCourses.map(c => c._id);
        const nestedSessions = await Promise.all(
            targetIds.map(id => SessionModel.listByCourse(id))
        );
        sessions = nestedSessions.flat();
    } else {
        const nestedSessions = await Promise.all(
            courses.map(c => SessionModel.listByCourse(c._id))
        );
        sessions = nestedSessions.flat();
    }


    const enrichedSessions = sessions.map(s => {
        const course = courseMap[String(s.courseId)];
        return {
            id: s._id,
            courseTitle: course ? course.title : "Unknown",
            courseLevel: course ? course.level : "N/A",
            start: fmtDateTime(s.startDateTime),
            capacity: s.capacity,
            bookedCount: s.bookedCount || 0
        };
    });

    enrichedSessions.sort((a, b) => new Date(a.start) - new Date(b.start));

    return { sessions: enrichedSessions };
};

/**
 * Returns a formatted class list (participants per session) for a given
 * course ID or session ID.
 * Throws if neither a course nor a session can be resolved from the given ID.
 *
 * @param {string} passedId - A course _id or session _id
 * @returns {Promise<{ course: { title: string }, sessions: object[] }>}
 */
export const getClassListData = async (passedId) => {
    if (!passedId) throw new Error("No ID provided to getClassListData");

    // Try resolving as a course first, then fall back to session lookup
    let course = await CourseModel.findById(passedId);
    if (!course) {
        const session = await SessionModel.findById(passedId);
        if (session) course = await CourseModel.findById(session.courseId);
    }
    if (!course) throw new Error(`Course not found for ID: ${passedId}`);

    const [sessions, allBookings, allUsers] = await Promise.all([
        SessionModel.listByCourse(course._id),
        BookingModel.list(),
        userModel.list(),
    ]);

    const formattedSessions = sessions.map((session) => {
        const currentSessionId = String(session._id);
        const currentCourseId  = String(course._id);

        const bookingsForSession = allBookings.filter((b) => {
            const sIds    = Array.isArray(b.sessionIds) ? b.sessionIds.map(String) : [];
            const status  = String(b.status || "").toUpperCase();
            const type    = String(b.type   || "").toUpperCase();
            const bCourse = b.courseId ? String(b.courseId) : null;

            if (status === "CANCELLED") return false;

            const isSessionMatch = sIds.includes(currentSessionId);
            const isCourseMatch  = type === "COURSE" && bCourse === currentCourseId;

            return isSessionMatch || isCourseMatch;
        });

        const participants = bookingsForSession.map((b) => {
            const user = allUsers.find((u) => String(u._id) === String(b.userId));
            return {
                name:  user ? user.name  : "Unknown Student",
                email: user ? user.email : "No Email",
            };
        });

        // Deduplicate by email so a user who booked both a session and a course
        // doesn't appear twice in the same session list.
        const uniqueParticipants = Array.from(
            new Map(participants.map((p) => [p.email, p])).values()
        );

        return {
            start:        fmtDate(session.startDateTime),
            participants: uniqueParticipants,
            count:        uniqueParticipants.length,
            rawDate:      new Date(session.startDateTime),
        };
    });

    formattedSessions.sort((a, b) => b.rawDate - a.rawDate);

    return { course: { title: course.title }, sessions: formattedSessions };
};

// ---------------------------------------------------------------------------
// Course CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a new course.
 *
 * @param {object} data - Course fields
 * @returns {Promise<object>}
 */
export const createCourse = async (data) => CourseModel.create(data);

/**
 * Deletes a course by ID.
 *
 * @param {string} id - Course DB ID
 * @returns {Promise<void>}
 */
export const deleteCourse = async (id) => CourseModel.delete(id);

/**
 * Updates a course by ID.
 *
 * @param {string} id   - Course DB ID
 * @param {object} data - Fields to update
 * @returns {Promise<object>}
 */
export const updateCourse = async (id, data) => CourseModel.update(id, data);

// ---------------------------------------------------------------------------
// Organiser CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all users with the organiser role.
 *
 * @returns {Promise<{ organisers: object[] }>}
 */
export const getOrganisersData = async () => {
    const users = await userModel.list();
    return { organisers: users.filter((u) => u.role === "organiser") };
};

/**
 * Creates a new organiser user.
 *
 * @param {object} data - User fields (name, email, etc.)
 * @returns {Promise<object>}
 */
export const createOrganiser = async (data) =>
    userModel.create({ ...data, role: "organiser" });

/**
 * Deletes an organiser user by ID.
 *
 * @param {string} id - User DB ID
 * @returns {Promise<void>}
 */
export const deleteOrganiser = async (id) => userModel.delete(id);

// ---------------------------------------------------------------------------
// User CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all users with the student (or legacy "user") role.
 *
 * @returns {Promise<{ users: object[] }>}
 */
export const getUsersData = async () => {
    const users = await userModel.list();
    return { users: users.filter((u) => u.role === "student" || u.role === "user") };
};

/**
 * Deletes a student user by ID.
 *
 * @param {string} id - User DB ID
 * @returns {Promise<void>}
 */
export const deleteUser = async (id) => userModel.delete(id);

// ---------------------------------------------------------------------------
// Instructor CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all users with the instructor role.
 *
 * @returns {Promise<{ instructors: object[] }>}
 */
export const getInstructorsData = async () => {
    const users = await userModel.list();
    return { instructors: users.filter((u) => u.role === "instructor") };
};

/**
 * Creates a new instructor user.
 *
 * @param {object} data - User fields (name, email, etc.)
 * @returns {Promise<object>}
 */
export const createInstructor = async (data) =>
    userModel.create({ ...data, role: "instructor" });

/**
 * Deletes an instructor user by ID.
 *
 * @param {string} id - User DB ID
 * @returns {Promise<void>}
 */
export const deleteInstructor = async (id) => userModel.delete(id);