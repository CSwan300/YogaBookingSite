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

## Accounts (Provided Seed has been run)
### Normal
```
Name: Fiona

Email: fiona@student.local

Password: password123

Role: student
```
### Admin
```
Name: Admin

Email: admin@yoga.local

Password: admin1234

Role: organiser

```

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