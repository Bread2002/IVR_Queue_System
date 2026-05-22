// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 20th, 2026
// Description: Database setup and initialization for the IVR Queue Management System.
//              This module creates necessary tables (team_members, callers, call_queue) and seeds them with mock data if they are empty.
//              It uses better-sqlite3 for SQLite interactions.

// Use the Turso serverless database connection
import db from "./turso-db.js";

// Define a helper function to initialize the database
async function initializeDatabase() {
  // Create a table for team members (agents) if it doesn't exist already
  await db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      role       TEXT NOT NULL,
      department TEXT NOT NULL,
      email      TEXT NOT NULL
    )
  `);

  // Check if the team_members table is empty, and if so, seed it with mock data
  const [{ count }] = await db.all(
    "SELECT COUNT(*) as count FROM team_members",
  );

  // If there are no team members,
  if (count === 0) {
    // Prepare an SQL statement for inserting team members
    const insert = await db.prepare(
      "INSERT INTO team_members (name, role, department, email) VALUES (?, ?, ?, ?)",
    );

    // Define an array of mock team members
    const members = [
      ["Alex Johnson", "Sales Lead", "Sales", "alex.johnson@company.com"],
      ["Sarah Chen", "Account Executive", "Sales", "sarah.chen@company.com"],
      [
        "Marcus Williams",
        "Support Manager",
        "Support",
        "marcus.williams@company.com",
      ],
      [
        "Emily Rodriguez",
        "Support Specialist",
        "Support",
        "emily.rodriguez@company.com",
      ],
      ["James Park", "Billing Analyst", "Billing", "james.park@company.com"],
      [
        "Olivia Thompson",
        "Billing Lead",
        "Billing",
        "olivia.thompson@company.com",
      ],
    ];

    // Insert each mock team member into the database
    for (const member of members) await insert.run(member);
    console.log("Database seeded with mock team members."); // Log a message indicating that seeding is complete
  }

  // Create a table for callers if it doesn't exist already
  await db.exec(`
    CREATE TABLE IF NOT EXISTS callers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT UNIQUE NOT NULL,
      name           TEXT NOT NULL,
      email          TEXT NOT NULL,
      tier           TEXT NOT NULL CHECK(tier IN ('standard', 'premium', 'vip'))
    )
  `);

  // Check if the callers table is empty, and if so, seed it with mock data
  const [{ count: callerCount }] = await db.all(
    "SELECT COUNT(*) as count FROM callers",
  );

  // If there are no callers,
  if (callerCount === 0) {
    // Prepare an SQL statement for inserting callers
    const insertCaller = await db.prepare(
      "INSERT INTO callers (account_number, name, email, tier) VALUES (?, ?, ?, ?)",
    );

    // Define an array of mock callers
    const callers = [
      ["ACC-1001", "Diana Prince", "diana.prince@example.com", "standard"],
      ["ACC-1002", "Bruce Wayne", "bruce.wayne@example.com", "premium"],
      ["ACC-1003", "Clark Kent", "clark.kent@example.com", "vip"],
      ["ACC-1004", "Lois Lane", "lois.lane@example.com", "standard"],
      ["ACC-1005", "Barry Allen", "barry.allen@example.com", "premium"],
    ];

    // Insert each mock caller into the database
    for (const caller of callers) await insertCaller.run(caller);
    console.log("Database seeded with mock callers."); // Log a message indicating that seeding is complete
  }

  // Create a table for the call queue if it doesn't exist already
  await db.exec(`
    CREATE TABLE IF NOT EXISTS call_queue (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number      TEXT NOT NULL,
      caller_name         TEXT,
      department          TEXT NOT NULL,
      issue               TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'waiting'
                          CHECK(status IN ('waiting', 'in-progress', 'completed', 'rejected')),
      verified            INTEGER,
      assigned_agent_id   INTEGER,
      assigned_agent_name TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at         TEXT,
      completed_at        TEXT
    )
  `);

  // Check if the call_queue table is empty, and if so, seed it with mock data
  const [{ count: queueCount }] = await db.all(
    "SELECT COUNT(*) as count FROM call_queue",
  );

  // If there are no calls in the queue,
  if (queueCount === 0) {
    // Prepare an SQL statement for inserting calls into the queue
    const insertCall = await db.prepare(`
      INSERT INTO call_queue
        (account_number, caller_name, department, issue, status,
        assigned_agent_id, assigned_agent_name, created_at, answered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Define an arrow function to generate timestamps for a given number of minutes ago
    const ago = (minutes: number) =>
      new Date(Date.now() - minutes * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

    // Define an array of mock calls to be inserted into the call queue
    const mockCalls = [
      // Sales - 1 waiting
      [
        "ACC-1001",
        "Diana Prince",
        "Sales",
        "Interested in upgrading my plan, want pricing info",
        "waiting",
        1,
        "Alex Johnson",
        ago(14),
        null,
      ],
      // Support - 1 waiting
      [
        "ACC-1004",
        "Lois Lane",
        "Support",
        "Mobile app keeps crashing after the latest update",
        "waiting",
        4,
        "Emily Rodriguez",
        ago(4),
        null,
      ],
      // Billing - 1 waiting
      [
        "ACC-1003",
        "Clark Kent",
        "Billing",
        "Invoice amount seems incorrect, need to review charges",
        "waiting",
        6,
        "Olivia Thompson",
        ago(9),
        null,
      ],
    ];

    // Insert each mock call into the database
    for (const call of mockCalls) await insertCall.run(call);
    console.log("Database seeded with mock call queue."); // Log a message indicating that seeding is complete
  }
}

// Kick off initialization immediately and export the promise so callers can
// await it before handling requests. Using a promise instead of top-level await
// keeps this module compatible with CommonJS environments (e.g. Jest / ts-jest).
export const initPromise: Promise<void> = initializeDatabase().catch((err) => {
  console.error("Database initialization failed:", err);
  throw err;
});

// Export the database connection for use in other modules
export default db;
