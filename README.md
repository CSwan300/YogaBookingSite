# **Live Demo** 
```
https://campbellswanwebdev2courseworklivedemo.onrender.com
```
# Yoga Booking — WAD2 Coursework

*A full-stack yoga class booking web application built with Node.js, Express, and NeDB.*

---

## Live Demo

Deployed at: [https://campbellswanwebdev2courseworklivedemo.onrender.com
](https://campbellswanwebdev2courseworklivedemo.onrender.com
)

---

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Templating:** Mustache (mustache-express)
- **Database:** NeDB (embedded, file-based NoSQL)
- **Authentication:** JSON Web Tokens (JWT) + cookie-parser
- **Styling:** Pure CSS
- **Testing:** Jest + Supertest
- **Dev tooling:** Nodemon, dotenv

---

## Project Structure

```
controllers/   — Route handler logic
db/            — NeDB database files
middlewares/   — Auth and request middleware
models/        — Data model definitions
public/        — Static assets (CSS, images, client-side JS)
routes/        — Express route definitions
seed/          — Database seed script
services/      — Business logic layer
tests/         — Jest test suites
views/         — Mustache HTML templates
index.js       — Application entry point
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

or copy env.example and rename to just .env

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

## Implemented Features

### Authentication & Authorisation
- User registration and login
- JWT-based authentication stored in secure cookies
- Protected routes via authentication middleware
- Role-based access control (user vs admin)

### Yoga Class Management
- Browse available yoga classes
- View class details (instructor, time, capacity)
- Book a place on a class
- Cancel an existing booking
- View personal booking history

### Data Layer
- NeDB embedded database — no external DB setup required
- Seed script to populate sample classes and users
- Separate model and service layers for clean architecture

### Templating & Frontend
- Server-side rendering with Mustache templates
- Custom CSS styling across all pages
- Responsive layout for the main booking interface

### Testing
- Jest test suite with Supertest for HTTP integration tests
- Tests cover core routes and API endpoints

---

## Repositories

- **Starter repo (original scaffold):** https://github.com/FionaMacRaeFairlie/WAD2_posscw_2526---Start
- **Completed repo (this project):** https://github.com/CSwan300/WAD2CW