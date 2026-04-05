##  Project Structure

```
root/
├── .github/
│   └── workflows/
│       └── deploy.yaml
│
├── controllers/
│   ├── authController.js
│   ├── bookingController.js
│   ├── courseController.js
│   ├── coursesListController.js
│   ├── organiserController.js
│   ├── profileController.js
│   └── viewsController.js
│
├── db/
│   ├── bookings.db
│   ├── courses.db
│   ├── sessions.db
│   └── users.db
│
├── middlewares/
│   └── auth.js
│
├── models/
│   ├── _db.js
│   ├── bookingModel.js
│   ├── courseModel.js
│   ├── sessionModel.js
│   └── userModel.js
│
├── public/
│   └── styles.css
│
├── routes/
│   ├── admin.js
│   ├── bookings.js
│   ├── courses.js
│   ├── profile.js
│   ├── sessions.js
│   └── views.js
│
├── seed/
│   └── seed.js
│
├── services/
│   ├── authService.js
│   ├── bookingService.js
│   ├── courseService.js
│   ├── formatService.js
│   ├── organiserService.js
│   └── profileService.js
│
├── tests/
│   ├── booking.test.js
│   ├── helpers.js
│   ├── routes.api.test.js
│   ├── routes.errors.test.js
│   ├── routes.health.test.js
│   └── routes.ssr.test.js
│
├── views/
│   ├── account/
│   │   ├── login.mustache
│   │   ├── logout.mustache
│   │   ├── profile.mustache
│   │   ├── profile-edit.mustache
│   │   └── register.mustache
│   │
│   ├── booking/
│   │   ├── booking_confirmation.mustache
│   │   ├── cancel_booking.mustache
│   │   ├── course_book.mustache
│   │   ├── my_bookings.mustache
│   │   └── session_book.mustache
│   │
│   ├── course/
│   │   ├── course.mustache
│   │   └── courses.mustache
│   │
│   ├── dashboards/
│   │   ├── adminDashboard.mustache
│   │   ├── classesDashboard.mustache
│   │   ├── classListDashboard.mustache
│   │   ├── coursesDashboard.mustache
│   │   ├── instructorsDashboard.mustache
│   │   ├── organisersDashboard.mustache
│   │   ├── updateCourse.mustache
│   │   └── usersDashboard.mustache
│   │
│   ├── misc/
│   │   ├── about.mustache
│   │   ├── error.mustache
│   │   ├── instructors.mustache
│   │   └── schedule.mustache
│   │
│   └── partials/
│       ├── footer.mustache
│       ├── head.mustache
│       └── header.mustache
├── utils/
│       └── env.mustache
│
├── .env.example
├── .gitignore
├── index.js
├── jest.config.mjs
├── STRUCTURE
├── package.json
├── package-lock.json
└── README
```