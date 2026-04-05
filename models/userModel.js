//models/userModel.js
import { usersDb } from "./_db.js";

/**
 * Candidate background colours for generated avatar URLs.
 *
 * @type {string[]}
 */
const AVATAR_COLORS = ["4F46E5", "059669", "D97706", "DB2777", "2563EB", "7C3AED"];

/**
 * Builds derived avatar-related fields from a user's name.
 * If a custom image is provided, it is used instead of the generated avatar URL.
 *
 * @param {string} name - The user's full name.
 * @param {string|null} [customImage=null] - An optional custom avatar URL.
 * @returns {{ userInitials: string, image: string }} Derived avatar metadata.
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

/**
 * User data access model.
 *
 * @type {{
 *   create(user: Object): Promise<Object>,
 *   findByEmail(email: string): Promise<Object|null>,
 *   findById(id: string): Promise<Object|null>,
 *   list(): Promise<Object[]>,
 *   delete(id: string): Promise<number>,
 *   update(id: string, data: Object): Promise<Object>
 * }}
 */
export const userModel = {
    /**
     * Creates a new user and derives avatar-related display fields.
     * Raw password fields are removed before persistence; callers should pass `passwordHash`.
     *
     * @async
     * @param {Object} user - The user payload to persist.
     * @param {string} user.name - The user's full name.
     * @param {string} user.email - The user's email address.
     * @param {string} [user.passwordHash] - The bcrypt password hash.
     * @param {string} [user.role] - The user's application role.
     * @param {string} [user.image] - Optional custom avatar URL.
     * @returns {Promise<Object>} The inserted user record.
     */
    async create(user) {
        const { userInitials, image } = deriveAvatarFields(user.name, user.image);

        const newUser = {
            ...user,
            userInitials,
            image,
            createdAt: new Date().toISOString(),
        };

        delete newUser.password;
        delete newUser.confirm_password;

        return usersDb.insert(newUser);
    },

    /**
     * Finds a single user by email address.
     *
     * @async
     * @param {string} email - The email address to search for.
     * @returns {Promise<Object|null>} The matching user or null.
     */
    async findByEmail(email) {
        return usersDb.findOne({ email });
    },

    /**
     * Finds a single user by their unique identifier.
     *
     * @async
     * @param {string} id - The user's unique ID.
     * @returns {Promise<Object|null>} The matching user or null.
     */
    async findById(id) {
        return usersDb.findOne({ _id: id });
    },

    /**
     * Returns all users in the database.
     *
     * @async
     * @returns {Promise<Object[]>} All stored users.
     */
    async list() {
        return usersDb.find({});
    },

    /**
     * Deletes a user by ID.
     *
     * @async
     * @param {string} id - The user's unique ID.
     * @returns {Promise<number>} The number of removed records.
     */
    async delete(id) {
        return usersDb.remove({ _id: id });
    },

    /**
     * Updates an existing user record and regenerates avatar-derived fields
     * if the user's name changes.
     *
     * @async
     * @param {string} id - The user's unique ID.
     * @param {Object} data - Partial user data to merge into the record.
     * @returns {Promise<Object>} The updated user record.
     * @throws {Error} If the user does not exist.
     */
    async update(id, data) {
        const existing = await usersDb.findOne({ _id: id });

        if (!existing) {
            throw new Error("User not found");
        }

        const nameChanged = data.name && data.name !== existing.name;
        const hasCustomImage =
            data.image !== undefined ? Boolean(data.image) : existing._hasCustomImage;

        /** @type {Object} */
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

        const updatedUser = {
            ...existing,
            ...data,
            ...avatarFields,
        };

        delete updatedUser.password;
        delete updatedUser.confirm_password;

        await usersDb.remove({ _id: id });
        await usersDb.insert(updatedUser);

        return updatedUser;
    },
};

export const UserModel = userModel;