import { coursesDb } from "./_db.js";

export const CourseModel = {
    async findById(id) {
        return coursesDb.findOne({ _id: id });
    },

    async list(filter = {}) {
        return coursesDb.find(filter).sort({ startDate: 1 });
    },

    async search({ level, type, dropin, q, page = 1, limit = 6 }) {
        const query = {};
        if (level) query.level = level;
        if (type)  query.type = type;
        if (dropin === 'yes') query.allowDropIn = true;
        if (dropin === 'no')  query.allowDropIn = false;

        if (q) {
            const regex = new RegExp(q, "i");
            query.$or = [{ title: regex }, { description: regex }];
        }

        const skip = (page - 1) * limit;
        const courses = await coursesDb.find(query).sort({ startDate: 1 }).skip(skip).limit(limit);
        const total = await coursesDb.count(query);

        return {
            courses,
            pagination: {
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
                total
            }
        };
    }
};