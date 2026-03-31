// jest.config.mjs
export default {
    testEnvironment: "node",
    transform: {},
    // REMOVED: extensionsToTreatAsEsm: ['.js'], <-- This was the cause of the error
    moduleNameMapper: {
        // Allows Jest to resolve imports that include the .js extension
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ["**/tests/**/*.test.js"]
};