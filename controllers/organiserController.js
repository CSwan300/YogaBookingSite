// controllers/organiserController.js
// Thin controller — all data logic lives in services/organiserService.js.
// This file only imports service results and passes them to res.render().

export {
    getAdminDashboardData,
    getCoursesDashboardData,
    createCourse,
    deleteCourse,
    updateCourse,
    getClassesDashboardData,
    getClassListData,
    getOrganisersData,
    createOrganiser,
    deleteOrganiser,
    getUsersData,
    deleteUser,
    getInstructorsData,
    createInstructor,
    deleteInstructor,
} from "../services/organiserService.js";