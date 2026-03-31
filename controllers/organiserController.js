// controllers/organiserController.js

import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { userModel } from "../models/userModel.js";

/* ── Helper Formatter ────────────────────────────────────────── */

const fmtDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year:    "numeric",
        month:   "short",
        day:     "numeric",
        hour:    "2-digit",
        minute:  "2-digit",
    });
};

/* ── Dashboard Data ─────────────────────────────────────────── */

export const getClassesDashboardData = async () => {
    const courses = await CourseModel.list();
    const allSessions = [];

    for (const course of courses) {
        const sessions = await SessionModel.listByCourse(course._id);
        allSessions.push(...sessions.map(s => ({
            id: s._id,
            courseId: course._id,
            courseTitle: course.title,
            courseLevel: course.level,
            start: fmtDate(s.startDateTime),
            capacity: s.capacity,
            bookedCount: s.bookedCount ?? 0,
            startDateTime: s.startDateTime
        })));
    }

    return {
        sessions: allSessions.sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
    };
};

/* ── Class List Logic ───────────────────────────────────────── */

export const getClassListData = async (passedId) => {
    // Safety check: ensure we actually have an ID
    if (!passedId) throw new Error("No ID provided to getClassListData");

    let course;

    // 1. Try finding by Course ID first
    course = await CourseModel.findById(passedId);

    // 2. If not found, check if it's a Session ID and get its courseId
    if (!course) {
        const session = await SessionModel.findById(passedId);
        if (session) {
            course = await CourseModel.findById(session.courseId);
        }
    }

    // LINE 71: This is where your error was triggering
    if (!course) throw new Error(`Course not found for ID: ${passedId}`);

    // 3. Fetch all required data
    const sessions = await SessionModel.listByCourse(course._id);
    const allBookings = await BookingModel.list();
    const allUsers = await userModel.list();

    // 4. Map through sessions to find participants
    const formattedSessions = sessions.map((session) => {
        const currentSessionId = String(session._id);
        const currentCourseId = String(course._id);

        const bookingsForThisSession = allBookings.filter(b => {
            const sIds = Array.isArray(b.sessionIds) ? b.sessionIds.map(id => String(id)) : [];
            const bCourseId = b.courseId ? String(b.courseId) : null;

            // Use Uppercase for comparisons to handle "course" vs "COURSE" in DB
            const status = String(b.status || "").toUpperCase();
            const type = String(b.type || "").toUpperCase();

            if (status === "CANCELLED") return false;

            // Logic: Match if session ID is in list OR if they booked the whole course
            const isSessionMatch = sIds.includes(currentSessionId);
            const isCourseMatch = (type === "COURSE") && (String(bCourseId) === currentCourseId);

            return isSessionMatch || isCourseMatch;
        });

        // 5. Map bookings to User Names/Emails
        const participantList = bookingsForThisSession.map(b => {
            const user = allUsers.find(u => String(u._id) === String(b.userId));
            return {
                name: user ? user.name : "Unknown Student",
                email: user ? user.email : "No Email"
            };
        });

        // 6. Deduplicate (prevents same user appearing twice for same session)
        const uniqueParticipants = Array.from(
            new Map(participantList.map(p => [p.email, p])).values()
        );

        return {
            start: fmtDate(session.startDateTime),
            participants: uniqueParticipants,
            count: uniqueParticipants.length,
            rawDate: new Date(session.startDateTime)
        };
    });

    // 7. Sort newest sessions to top
    formattedSessions.sort((a, b) => b.rawDate - a.rawDate);

    return {
        course: { title: course.title },
        sessions: formattedSessions
    };
};

/* ── Admin Management Methods ────────────────── */

export const getAdminDashboardData = async () => {
    const courses = await CourseModel.list();
    const users = await userModel.list();
    const bookings = await BookingModel.list();
    return {
        courseCount: courses.length,
        userCount: users.length,
        bookingCount: bookings.filter(b => String(b.status).toUpperCase() !== "CANCELLED").length
    };
};

export const getCoursesDashboardData = async () => {
    const courses = await CourseModel.list();
    const instructors = (await userModel.list()).filter(u => u.role === 'instructor');
    return { courses, instructors };
};

export const createCourse = async (data) => await CourseModel.create(data);
export const deleteCourse = async (id) => await CourseModel.delete(id);
export const updateCourse = async (id, data) => await CourseModel.update(id, data);

export const getOrganisersData = async () => {
    const users = await userModel.list();
    return { organisers: users.filter(u => u.role === 'organiser') };
};

export const createOrganiser = async (data) => await userModel.create({ ...data, role: 'organiser' });
export const deleteOrganiser = async (id) => await userModel.delete(id);

export const getUsersData = async () => {
    const users = await userModel.list();
    // Adjusted filter to catch 'student' role found in your DB
    return { users: users.filter(u => u.role === 'student' || u.role === 'user') };
};

export const deleteUser = async (id) => await userModel.delete(id);

export const getInstructorsData = async () => {
    const users = await userModel.list();
    return { instructors: users.filter(u => u.role === 'instructor') };
};

export const createInstructor = async (data) => await userModel.create({ ...data, role: 'instructor' });
export const deleteInstructor = async (id) => await userModel.delete(id);