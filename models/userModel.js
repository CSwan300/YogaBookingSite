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

    async update(id, data) {
        const existing = await usersDb.findOne({ _id: id });
        if (!existing) throw new Error('User not found');

        // Regenerate avatar fields whenever name changes,
        // but only if the user doesn't have a manually uploaded image.
        const nameChanged = data.name && data.name !== existing.name;
        const hasCustomImage = data.image !== undefined
            ? Boolean(data.image)
            : existing._hasCustomImage;

        let avatarFields = {};
        if (nameChanged && !hasCustomImage) {
            avatarFields = deriveAvatarFields(data.name);
        } else if (nameChanged && hasCustomImage) {
            // Name changed but keep their custom photo — just redo initials
            const { userInitials } = deriveAvatarFields(data.name, existing.image);
            avatarFields = { userInitials };
        }

        // If a new custom image is being set, flag it
        if (data.image) {
            avatarFields._hasCustomImage = true;
        }

        const updatePayload = { ...data, ...avatarFields };

        await usersDb.update(
            { _id: id },
            { $set: updatePayload },
            { multi: false }
        );

        return usersDb.findOne({ _id: id });
    },
};