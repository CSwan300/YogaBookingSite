import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import { BookingModel } from "../models/bookingModel.js";

/* ── Helpers ────────────────────────────────────────────────── */

const fmtDate = (iso) => new Date(iso).toLocaleString("en-GB", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
});

const fmtDateOnly = (iso) => new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric", month: "short", day: "numeric"
});

const fmtType = (raw) => (raw ?? "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/* ── Dashboard Data Fetchers ────────────────────────────────── */

export const getAdminDashboardData = async () => ({});

export const getCoursesDashboardData = async () => {
    const courses = await CourseModel.list();
    const users = await UserModel.list();

    const instructors = users
        .filter(u => u.role === "instructor")
        .map(u => ({ id: u._id, name: u.name }));

    return {
        instructors,
        courses: await Promise.all(courses.map(async (c) => ({
            _id: c._id,
            title: c.title,
            level: c.level,
            type: fmtType(c.type),
            price: c.price,
            startDate: c.startDate ? fmtDateOnly(c.startDate) : "TBC",
            endDate: c.endDate ? fmtDateOnly(c.endDate) : "TBC",
            sessionsCount: (await SessionModel.listByCourse(c._id)).length
        })))
    };
};

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

/* ── Class List / Participants Logic ───────────────────────── */

export const getClassListData = async (courseId) => {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new Error("Course not found");

    const sessions = await SessionModel.listByCourse(course._id);
    const allBookings = await BookingModel.list();
    const allUsers = await UserModel.list();

    const formattedSessions = sessions.map((session) => {
        // Filter bookings that contain this specific session ID and aren't cancelled
        const bookingsForThisSession = allBookings.filter(b => {
            const sIds = b.sessionIds || [];
            const isActive = b.status?.toUpperCase() !== "CANCELLED";
            return sIds.some(id => String(id) === String(session._id)) && isActive;
        });

        // Map the bookings to actual User names by matching IDs
        const participantList = bookingsForThisSession.map(b => {
            const user = allUsers.find(u => String(u._id) === String(b.userId));
            return {
                name: user ? user.name : "Unknown Student",
                email: user ? user.email : "No Email"
            };
        });

        return {
            start: fmtDate(session.startDateTime),
            participants: participantList,
            count: participantList.length
        };
    });

    return {
        course: { title: course.title },
        sessions: formattedSessions
    };
};

/* ── Course CRUD ────────────────────────────────────────────── */

export const createCourse = async (courseData) => {
    const formattedData = {
        ...courseData,
        // Convert checkbox "on" or string "true" to a real boolean
        allowDropIn: courseData.allowDropIn === 'true' || courseData.allowDropIn === 'on',
        price: parseFloat(courseData.price),
        sessionIds: [], // Initialise empty
        createdAt: new Date().toISOString()
    };
    return await CourseModel.create(formattedData);
};

export const deleteCourse = async (id) => {
    return await CourseModel.delete(id);
};

export const updateCourse = async (id, updateData) => {
    return await CourseModel.update(id, updateData);
};

/* ── Organiser Management ───────────────────────────────────── */

export const getOrganisersData = async () => {
    const users = await UserModel.list();
    return { organisers: users.filter(u => u.role === "organiser") };
};

export const createOrganiser = async (userData) => {
    return await UserModel.create({ ...userData, role: "organiser" });
};

export const deleteOrganiser = async (id) => {
    return await UserModel.delete(id);
};

/* ── User Management ────────────────────────────────────────── */

export const getUsersData = async () => {
    const users = await UserModel.list();
    return { users: users.filter(u => u.role !== "organiser") };
};

export const deleteUser = async (id) => {
    return await UserModel.delete(id);
};

/* ── Instructor Management ───────────────────────────────────── */

export const getInstructorsData = async () => {
    const users = await UserModel.list();
    // Filter to only show users with the instructor role
    return {
        instructors: users.filter(u => u.role === "instructor"),
        title: "Manage Instructors"
    };
};

export const createInstructor = async (userData) => {
    // We ensure the role is set to instructor regardless of form input
    return await UserModel.create({
        ...userData,
        role: "instructor",
        userInitials: userData.name ? userData.name.charAt(0).toUpperCase() : "I",
        createdAt: new Date().toISOString()
    });
};

export const deleteInstructor = async (id) => {
    return await UserModel.delete(id);
};