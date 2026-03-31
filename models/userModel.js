import { usersDb } from "./_db.js";

const AVATAR_COLORS = ["4F46E5", "059669", "D97706", "DB2777", "2563EB", "7C3AED"];

/**
 * Generates initials and a UI-Avatar URL based on the user's name.
 */
function deriveAvatarFields(name, customImage = null) {
    const userInitials = name
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const bgColor = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
    const generatedImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
    )}&background=${bgColor}&color=fff&size=128`;

    return {
        userInitials,
        image: customImage || generatedImage,
    };
}

export const userModel = {
    /**
     * Creates a new user with generated avatar fields.
     */
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

    /**
     * Finds a single user by email address.
     */
    async findByEmail(email) {
        return usersDb.findOne({ email });
    },

    /**
     * Finds a single user by their unique ID.
     */
    async findById(id) {
        return usersDb.findOne({ _id: id });
    },

    /**
     * Returns all users in the database.
     */
    async list() {
        return usersDb.find({});
    },

    /**
     * Deletes a user by ID.
     */
    async delete(id) {
        return usersDb.remove({ _id: id });
    },

    /**
     * Updates user data and regenerates avatar initials if the name changes.
     */
    async update(id, data) {
        const existing = await usersDb.findOne({ _id: id });
        if (!existing) throw new Error("User not found");

        const nameChanged = data.name && data.name !== existing.name;
        const hasCustomImage =
            data.image !== undefined ? Boolean(data.image) : existing._hasCustomImage;

        let avatarFields = {};

        // If name changes, update initials. 
        // If they don't have a custom uploaded image, update the UI-Avatar too.
        if (nameChanged && !hasCustomImage) {
            avatarFields = deriveAvatarFields(data.name);
        } else if (nameChanged && hasCustomImage) {
            const { userInitials } = deriveAvatarFields(data.name, existing.image);
            avatarFields = { userInitials };
        }

        if (data.image) {
            avatarFields._hasCustomImage = true;
        }

        const updatedUser = {
            ...existing,
            ...data,
            ...avatarFields,
        };

        // Standard pattern for NeDB: remove then re-insert
        await usersDb.remove({ _id: id });
        await usersDb.insert(updatedUser);

        return updatedUser;
    },
};
