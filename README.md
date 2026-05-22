# **IVR Queue System**

### _Copyright (c) 2026, Rye Stahle-Smith_

---

## 📌 Overview

An IVR queue management system built with **React TS + Express**, backed by a **Turso** (serverless SQLite) database and deployed on **Vercel**. Callers submit their account number, department, and issue through a public-facing form. Authenticated agents get a live dashboard to answer and manage calls across all departments.

---

## ⚙️ Features

- 📞 **Queue Submission** — Public form for callers to join the support queue with account lookup, department selection, and issue description
- 🤖 **Smart Agent Routing** — Keyword-matching assigns the best available agent per issue; VIP callers are escalated to leads/managers automatically
- 📊 **Agent Dashboard** — Auth0-protected view for agents; filter by department, answer calls, and mark them complete
- ⏱️ **Position & Wait Estimates** — Returns queue position and estimated wait time on submission
- ☁️ **Serverless** — Node/Express API deployed as a Vercel function; Turso handles the database over HTTP (no persistent server)

---

## 📂 Repository Structure

```
IVR_Queue_System/
├── client/                     # React frontend (Vite + TypeScript)
│   └── src/
│       ├── App.tsx             # Main app (submit form + agent dashboard)
│       ├── utils.ts            # Timestamp and wait-time helpers
│       └── main.tsx            # Entry point + Auth0 provider
└── server/                     # Express API (TypeScript)
    ├── index.ts                # API routes and server entry point
    ├── database.ts             # Table creation, seeding, and init
    ├── turso-db.ts             # Turso serverless database connection
    └── vercel.json             # Vercel deployment config
```

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech) database (free tier works)
- An [Auth0](https://auth0.com) application (for agent login)
- A [Vercel](https://vercel.com) account (for deployment)

---

### 🖥️ Server

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file:

   ```env
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   ```

3. Run locally:
   ```bash
   npm run dev
   ```
   Server starts on `http://localhost:3000`.

---

### 🌐 Client

1. Install dependencies:

   ```bash
   cd client
   npm install
   ```

2. Create a `.env` file:

   ```env
   VITE_API_URL=http://localhost:3000
   VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   ```

   > ⚠️ **Note:** In production, leave `VITE_API_URL` unset so requests are relative to the same Vercel origin.

3. Run locally:
   ```bash
   npm run dev
   ```

---

### ☁️ Deploying to Vercel

Both the `client/` and `server/` subdirectories can be deployed as separate Vercel projects. Add the environment variables above to each project's Vercel dashboard before deploying.

---

## 🔌 API Endpoints

| Method  | Endpoint                      | Description                                                      |
| ------- | ----------------------------- | ---------------------------------------------------------------- |
| `GET`   | `/api/departments`            | List all unique departments                                      |
| `GET`   | `/api/team`                   | List all agents                                                  |
| `GET`   | `/api/callers/:accountNumber` | Look up a caller by account number                               |
| `POST`  | `/api/queue`                  | Submit a new call; returns position and estimated wait           |
| `GET`   | `/api/queue`                  | Get the full queue (filterable by `?status=waiting,in-progress`) |
| `GET`   | `/api/queue/next`             | Peek at the next waiting call (filterable by `?department=`)     |
| `PATCH` | `/api/queue/:id/answer`       | Mark a call as in-progress                                       |
| `PATCH` | `/api/queue/:id/verify`       | Verify (`?verified=true`) or reject (`?verified=false`) a call   |
| `PATCH` | `/api/queue/:id/complete`     | Mark an in-progress call as completed                            |
