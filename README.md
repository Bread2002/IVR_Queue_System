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

### ☁️ Deploy the Server (Vercel + Turso)

1. Push the `server/` directory to its own GitHub repo (or as a Vercel project root)

2. In your Vercel project dashboard, add the following environment variables:
   ```env
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   ```

3. Deploy — Vercel picks up `vercel.json` automatically. Your API base URL will be something like `https://your-project.vercel.app`

---

### 🌐 Run the Client

1. Install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Create a `.env` file pointing at your live Vercel API:
   ```env
   VITE_API_URL=https://your-project.vercel.app
   VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   ```

3. Run:
   ```bash
   npm run dev
   ```

---

### 🖥️ Running the Server Locally (optional)

If you need to test the API locally before deploying:

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

3. Build and start:
   ```bash
   npm run build
   npm start
   ```
   Server starts on `http://localhost:3000`. Set `VITE_API_URL=http://localhost:3000` in the client `.env` to point at it.

#### Mock Data / Seeding

On first boot, the server automatically creates the database tables and seeds them with mock data if they're empty. This works against your Turso database, so **running locally is also a convenient way to populate a fresh Turso instance before deploying to Vercel**.

The following mock data is seeded:

- **Team Members** — 6 agents across Sales, Support, and Billing (e.g. `Alex Johnson - Sales Lead`, `Marcus Williams - Support Manager`)
- **Callers** — 5 accounts (`ACC-1001` through `ACC-1005`) with mixed tiers: standard, premium, and VIP
- **Call Queue** — 3 pre-populated waiting calls, one per department, with realistic timestamps and agent assignments

> ⚠️ **Note:** Seeding only runs when the tables are empty. To re-seed, drop the tables from your Turso dashboard and restart the server.

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
| `PATCH` | `/api/queue/:id/verify`       | Verify (`?verified=true`) or reject (`?verified=false`) a call   |
| `PATCH` | `/api/queue/:id/complete`     | Mark an in-progress call as completed                            |
