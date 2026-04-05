import dotenv from "dotenv";

dotenv.config();

export const env = {
    NODE_ENV:      process.env.NODE_ENV      || "development",
    PORT:          process.env.PORT          || 3000,
    COOKIE_SECRET: process.env.COOKIE_SECRET || "Load_Fail",
    JWT_SECRET:    process.env.JWT_SECRET    || "Load_Fail",
};

export const isTest = env.NODE_ENV === "test";

