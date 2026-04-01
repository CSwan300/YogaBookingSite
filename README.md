# Yoga Booking — WAD2 Coursework

*A full-stack yoga class booking web application built with Node.js, Express, and NeDB.*

---

## Live Demo

Deployed at: [https://campbellswanwebdev2courseworklivedemo.onrender.com](https://campbellswanwebdev2courseworklivedemo.onrender.com)

---

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Templating:** Mustache (mustache-express)
- **Database:** NeDB (embedded, file-based NoSQL)
- **Authentication:** JSON Web Tokens (JWT) + cookie-parser
- **Styling:** Pure CSS
- **Testing:** Jest + Supertest
- **CI/CD:** GitHub Actions + Render
- **Dev tooling:** Nodemon, dotenv

---

##  Project Structure

```
yoga-booking-app/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline (test → deploy)
├── controllers/
│   ├── authController.js           # Login, logout, and registration
│   ├── bookingController.js        # Booking & cancellation logic (API + form handlers)
│   ├── courseController.js         # Course & session API endpoints
│   ├── coursesListController.js    # Courses listing page (filters, pagination, search)
│   ├── organiserController.js      # Admin dashboard data retrieval
│   ├── profileController.js        # User profile view & edit logic
│   └── viewsController.js          # Page rendering (delegates to specific controllers)
├── db/
│   ├── bookings.db                 # Booking records
│   ├── courses.db                  # Course metadata
│   ├── sessions.db                 # Individual class/session data
│   └── users.db                    # User accounts and credentials
├── middlewares/
│   ├── auth.js                     # Session/JWT authentication checks
│   └── demoUser.js                 # Mock user data for development/testing
├── models/
│   ├── _db.js                      # Centralised NeDB connection manager
│   ├── bookingModel.js             # model for booking operations
│   ├── courseModel.js              # model for course information
│   ├── sessionModel.js             # model for session scheduling
│   └── userModel.js                # model for user profiles and security
├── public/
│   └── styles.css                  # Global application stylesheet
├── routes/
│   ├── admin.js                    # Admin dashboard routes
│   ├── bookings.js                 # Booking API & form routes
│   ├── courses.js                  # Course routes (hybrid API + page)
│   ├── profile.js                  # User profile routes
│   ├── sessions.js                 # Session-specific routes
│   └── views.js                    # Public-facing page routes
├── seed/
│   └── seed.js                     # Script to reset and populate the DB with initial data
├── services/
│   └── bookingService.js           # Core business logic for booking rules
├── tests/
│   ├── booking.test.js             # Unit tests for booking logic
│   ├── helpers.js                  # Test utilities and setup/teardown functions
│   ├── routes.api.test.js          # Integration tests for API endpoints
│   ├── routes.errors.test.js       # Error handling and status code tests
│   ├── routes.health.test.js       # Server uptime and connectivity checks
│   └── routes.ssr.test.js          # Tests for server-side rendered templates
├── views/
│   ├── account/
│   │   ├── login.mustache          # User sign-in form
│   │   ├── logout.mustache         # Sign-out confirmation or redirect page
│   │   ├── profile.mustache        # User account details view
│   │   ├── profile-edit.mustache   # Form to update user information
│   │   └── register.mustache       # New user sign-up form
│   ├── booking/
│   │   ├── booking_confirmation.mustache  # Post-booking success page
│   │   ├── cancel_booking.mustache        # Booking cancellation interface
│   │   ├── course_book.mustache           # Main booking page for a specific course
│   │   ├── my_bookings.mustache           # Dashboard for a user's active/past bookings
│   │   └── session_book.mustache          # Selection page for specific time slots/sessions
│   ├── course/
│   │   ├── course.mustache         # Detailed view for a single course
│   │   └── courses.mustache        # Searchable gallery/list of all available courses
│   ├── dashboards/
│   │   ├── adminDashboard.mustache        # High-level overview for administrators
│   │   ├── classesDashboard.mustache      # Management view for individual class sessions
│   │   ├── classListDashboard.mustache    # Detailed roster/attendee list for a class
│   │   ├── coursesDashboard.mustache      # Admin-only course management list
│   │   ├── instructorsDashboard.mustache  # Management panel for staff/instructors
│   │   ├── organisersDashboard.mustache   # Dashboard for event/course organisers
│   │   ├── updateCourse.mustache          # Editor interface for existing course content
│   │   └── usersDashboard.mustache        # User account management and permissions
│   ├── misc/
│   │   ├── about.mustache          # Project information and "About Us" content
│   │   ├── error.mustache          # Generic error handler (404, 500)
│   │   ├── instructors.mustache    # Public directory of course instructors
│   │   └── schedule.mustache       # Master calendar/timetable view
│   ├── partials/
│   │   ├── footer.mustache         # Standardised page footer and copyright
│   │   ├── head.mustache           # HTML <head> (metadata, CSS imports, title)
│   │   └── header.mustache         # Global navigation bar and branding
│   └── home.mustache               # Main application landing page
├── .env                            # Environment variables (ignored by Git)
├── .gitignore                      # Ignores node_modules and .db files
├── index.js                        # Application entry point and server configuration
└── package.json                    # Project metadata, dependencies, and scripts
```


---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Installation & Setup

**1. Clone the repository**

```bash
git clone https://github.com/CSwan300/WAD2CW.git
cd WAD2CW
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file in the project root:

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 64)
COOKIE_SECRET=$(openssl rand -hex 64)
PORT=3000" > .env
```

Or copy `.env.example` and rename it to `.env`.

**4. Seed the database** *(optional but recommended)*

```bash
npm run seed
```

**5. Start the application**

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the server in production mode |
| `npm run dev` | Start with nodemon auto-reload |
| `npm run seed` | Populate the database with sample data |
| `npm test` | Run the Jest test suite |

---

## CI/CD Pipeline

This project uses **GitHub Actions** to automate testing and deployment on every push to `main`.

### Pipeline steps

```
git push main
      │
      ▼
 npm run test (Jest + --forceExit)
      │ fails → pipeline stops, no deploy
      │ passes
      ▼
 Trigger Render deploy hook
      │
      ▼
 Render runs: npm ci && npm run seed → npm run start
```

### Setup requirements

**GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `COOKIE_SECRET` | Must match your Render environment variable |
| `JWT_SECRET` | Must match your Render environment variable |
| `RENDER_DEPLOY_HOOK_URL` | Deploy hook URL from Render |

**Render settings:**

| Field | Value |
|---|---|
| Build Command | `npm ci && npm run seed` |
| Start Command | `npm run start` |
| Auto-Deploy | Off |

---

## Implemented Features

### Authentication & Authorisation

- User registration and login
- JWT-based authentication stored in secure cookies
- Protected routes via authentication middleware
- Role-based access control (student / organiser)
- Specialised dashboards for the organiser role

### Yoga Class Management

- Browse available yoga courses with filters (level, type, drop-in)
- Full-text search across course titles and descriptions
- View course details (sessions, capacity, location)
- Book an entire course or individual drop-in sessions
- Cancel an existing booking or individual session
- View personal booking history
- Schedule view with weekly calendar layout

### Data Layer

- NeDB embedded database (file-based, no external DB required)
- Seed script to populate sample courses, sessions, and users
- Separate model, service, and controller layers for clean architecture

### Templating & Frontend

- Server-side rendering with Mustache templates
- Custom CSS styling across all pages
- Responsive layout for the main booking interface

### Testing

- Jest test suite with Supertest for HTTP integration tests
- Tests cover core routes and API endpoints
- `--forceExit` flag ensures Jest terminates cleanly in CI

---

## Repositories

- **Starter repo (original scaffold):** https://github.com/FionaMacRaeFairlie/WAD2_posscw_2526---Start
- **Completed repo (this project):** https://github.com/CSwan300/WAD2CW