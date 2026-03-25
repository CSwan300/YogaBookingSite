import { usersDb } from './_db.js';

const AVATAR_COLORS = ['4F46E5', '059669', 'D97706', 'DB2777', '2563EB', '7C3AED'];

function deriveAvatarFields(name, customImage = null) {
    const userInitials = name
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const bgColor = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
    const generatedImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=128`;

    return {
        userInitials,
        image: customImage || generatedImage,
    };
}

export const UserModel = {
    async create(user) {
        const { userInitials, image } = deriveAvatarFields(user.name, user.image);

        const newUser = {
            ...user,
            userInitials,
            image,
            createdAt: new Date().toISOString(),
        };

        return usersDb.insert(newUser);
    },

    async findByEmail(email) {
        return usersDb.findOne({ email });
    },

    async findById(id) {
        return usersDb.findOne({ _id: id });
    },

    async list() {
        return usersDb.find({});
    },

    async delete(id) {
        return usersDb.remove({ _id: id });
    },

    async update(id, data) {
        const existing = await usersDb.findOne({ _id: id });
        if (!existing) throw new Error('User not found');

        const nameChanged = data.name && data.name !== existing.name;
        const hasCustomImage = data.image !== undefined
            ? Boolean(data.image)
            : existing._hasCustomImage;

        let avatarFields = {};
        if (nameChanged && !hasCustomImage) {
            avatarFields = deriveAvatarFields(data.name);
        } else if (nameChanged && hasCustomImage) {
            const { userInitials } = deriveAvatarFields(data.name, existing.image);
            avatarFields = { userInitials };
        }

        if (data.image) {
            avatarFields._hasCustomImage = true;
        }

        // Merge all fields into a single updated object
        const updatedUser = {
            ...existing,
            ...data,
            ...avatarFields
        };

        // FORCE REPLACEMENT: Remove the old entry and insert the updated one
        // This solves the issue where update() creates a second entry
        await usersDb.remove({ _id: id });
        await usersDb.insert(updatedUser);

        return updatedUser;
    },
};