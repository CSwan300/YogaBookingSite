// // middlewares/demoUser.js
//  Currently Not in use by the program
// import { UserModel } from "../models/userModel.js";
//
// export const attachDemoUser = async (req, res, next) => {
//     if (req.path.startsWith('/schedule')) return next(); // skip
//
//     try {
//         const email = "fiona@student.local";
//         let user = await UserModel.findByEmail(email);
//         if (!user) {
//             user = await UserModel.create({ name: "Fiona", email, role: "student" });
//         }
//         req.user = user;
//         res.locals.user = null; // don't auto-login in the UI
//         next();
//     } catch (err) {
//         next(err);
//     }
// };