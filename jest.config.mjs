// jest.config.mjs
export default {
    testEnvironment: "node",
    transform: {},
    moduleNameMapper: {
        // Allows Jest to resolve imports that include the .js extension
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ["**/tests/**/*.test.js"]
};
