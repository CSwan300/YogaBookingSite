import { usersDb } from './_db.js';

export const UserModel = {
    async create(user) {
        // Set a default avatar if none is provided during signup
        const newUser = {
            ...user,
            profileImage: user.profileImage || '/uploads/default-avatar.png'
        };
        return usersDb.insert(newUser);
    },

    async update(id, updates) {
        // $set ensures we only change specific fields without overwriting the whole document
        return usersDb.update({ _id: id }, { $set: updates });
    },

    async findByEmail(email) {
        return usersDb.findOne({ email });
    },

    async findById(id) {
        return usersDb.findOne({ _id: id });
    },

    async list() {
        return usersDb.find({});
    }
};