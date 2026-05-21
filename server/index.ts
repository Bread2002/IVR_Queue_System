// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 20th, 2026
// Description: Node Express server for the IVR Queue Management System.
//              Provides API endpoints for managing callers, team members, and the call queue.

// Import necessary modules and initialize the database connection
// const express = require('express');
// const cors = require('cors');
// const db = require('./database.ts');
import { config } from "dotenv";
config(); // Load environment variables from .env file

import express from "express";
import cors from "cors";
import db from "./database.js";

type Agent = {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
};

// Create an Express application and set the port
const app = express();
const port = process.env.PORT || 3000;

// Set up middleware for CORS and JSON parsing
app.use(cors({ origin: "*" }));
app.use(express.json());

// Define a helper function to find the best available agent based on department, issue keywords, and caller tier
async function findAgent(
  department: string,
  issue: string,
  caller: any,
): Promise<Agent | null> {
  // If a department is specified, filter agents by that department; otherwise, consider all agents
  let candidates: Agent[] = department?.trim()
    ? await (
        await db.prepare("SELECT * FROM team_members WHERE department = ?")
      ).all([department])
    : await db.execute("SELECT * FROM team_members");

  // If no candidates are found for the specified department,
  if (candidates.length === 0)
    // Fall back to considering all agents
    candidates = await db.execute("SELECT * FROM team_members");

  // Define variables for tracking the best matched agent and the highest score
  const words = (issue || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w: string) => w.length > 2);
  let matched: any = candidates[0] || null;
  let topScore = 0;

  // For each candidate agent,
  for (const agent of candidates) {
    // Define a string (hay) that combines the agent's role and department
    const hay = `${agent.role} ${agent.department}`.toLowerCase();
    // Calculate a score based on how many of the issue keywords (words) are found in the hay string
    const score = words.reduce(
      (n: number, w: string) => n + (hay.includes(w) ? 1 : 0),
      0,
    );
    // If the calculated score is higher than the current top score,
    if (score > topScore) {
      // Update the top score and set the matched agent to the current candidate
      topScore = score;
      matched = agent;
    }
  }

  // If the caller is a VIP,
  if (caller?.tier === "vip") {
    // Try to find an agent with a role that includes "lead", "executive", or "manager"
    const vip = candidates.find((a: Agent) =>
      /lead|executive|manager/i.test(a.role),
    );
    // If such an agent is found, set the matched agent to that VIP-specialized agent
    if (vip) matched = vip;
  }

  // Return the matched agent
  return matched;
}

// Helpful function to calculate the current position of a call in the waiting queue based on its ID
async function getPosition(callId: number): Promise<number> {
  // Prepare and execute an SQL query to count how many calls are ahead of the given call ID
  const row: any = await (
    await db.prepare(
      `SELECT COUNT(*) as pos FROM call_queue WHERE status = 'waiting' AND id <= ?`,
    )
  ).get(callId);

  // Return the calculated position
  return row.pos;
}

// Define a route for the root URL that sends a welcome message
app.get("/", async (_, res) => {
  res.send("Welcome to the Node Express server!");
});

// Define a route for the API endpoint that returns a greeting message
app.get("/api/hello", async (_, res) => {
  res.json({ message: "Hello from the API!" });
});

// Define a route for the API endpoint that returns all team members from the database
app.get("/api/team", async (_, res) => {
  res.json({ team: await db.execute("SELECT * FROM team_members") });
});

// Define a route for the API endpoint that returns all unique departments from the team members in the database
app.get("/api/departments", async (_, res) => {
  const rows = await db.execute(
    "SELECT DISTINCT department FROM team_members ORDER BY department",
  );
  res.json({ departments: rows.map((r: any) => r.department) });
});

// Define a route for the API endpoint that returns caller information
app.get("/api/callers/:accountNumber", async (req, res) => {
  const caller = await (
    await db.prepare("SELECT * FROM callers WHERE account_number = ?")
  ).get(req.params.accountNumber);
  if (!caller) return res.status(404).json({ error: "Caller not found" });
  res.json({ caller });
});

// Define a route for the API endpoint that allows adding a new call to the queue
app.post("/api/queue", async (req, res) => {
  const { accountNumber, department, issue } = req.body;

  const caller: any =
    (await (
      await db.prepare("SELECT * FROM callers WHERE account_number = ?")
    ).get(accountNumber)) || null;

  const agent = await findAgent(department, issue, caller);

  const result = await (
    await db.prepare(
      `
    INSERT INTO call_queue (account_number, caller_name, department, issue, assigned_agent_id, assigned_agent_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    )
  ).run([
    accountNumber || "",
    caller?.name || null,
    department || "",
    issue || "",
    agent?.id ?? null,
    agent?.name ?? null,
  ]);

  const call: any = await (
    await db.prepare("SELECT * FROM call_queue WHERE id = ?")
  ).get(result.lastInsertRowid);
  const position = await getPosition(call.id);

  res.json({ call, position, estimated_wait: position * 4 });
});

// Define a route for the API endpoint that returns the current call queue
app.get("/api/queue", async (req, res) => {
  const { status } = req.query;
  let rows: any[];

  if (status) {
    const statuses = (status as string).split(",");
    const placeholders = statuses.map(() => "?").join(", ");
    rows = await (
      await db.prepare(
        `SELECT * FROM call_queue WHERE status IN (${placeholders}) ORDER BY created_at ASC`,
      )
    ).all(...statuses);
  } else {
    rows = await db.execute("SELECT * FROM call_queue ORDER BY created_at ASC");
  }

  const enriched = rows.map(async (row: any) => {
    const position = await getPosition(row.id);
    return {
      ...row,
      position: row.status === "waiting" ? position : null,
      estimated_wait: row.status === "waiting" ? position * 4 : null,
    };
  });

  res.json({ calls: await Promise.all(enriched) });
});

// Define a route for the API endpoint that returns the next caller in the queue (read-only)
app.get("/api/queue/next", async (req, res) => {
  const { department } = req.query;

  const sql = `
    SELECT
      q.id              AS call_id,
      q.account_number,
      q.department,
      q.issue,
      q.status,
      q.created_at,
      c.name            AS caller_name,
      c.email           AS caller_email,
      c.tier            AS caller_tier,
      q.assigned_agent_id,
      q.assigned_agent_name,
      m.role            AS agent_role,
      m.email           AS agent_email
    FROM call_queue q
    LEFT JOIN callers      c ON c.account_number = q.account_number
    LEFT JOIN team_members m ON m.id = q.assigned_agent_id
    WHERE q.status = 'waiting'
    ${department ? "AND q.department = ?" : ""}
    ORDER BY q.created_at ASC
    LIMIT 1
  `;

  const next: any = department
    ? await (await db.prepare(sql)).get(department)
    : await db.execute(sql);

  if (!next)
    return res.status(404).json({ error: "No callers currently waiting" });
  res.json({ call: next });
});

// Define a route for the API endpoint that allows verifying a call (write access)
app.patch("/api/queue/:id/verify", async (req, res) => {
  const { id } = req.params;
  const verified = req.query.verified === "true";

  const call: any = await (
    await db.prepare("SELECT * FROM call_queue WHERE id = ?")
  ).get(id);
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (call.status !== "waiting")
    return res.status(400).json({
      error: `Call is not in waiting state (current: ${call.status})`,
    });

  if (verified) {
    await (
      await db.prepare(
        `UPDATE call_queue SET status = 'in-progress', verified = 1, answered_at = datetime('now') WHERE id = ?`,
      )
    ).run(id);
  } else {
    await (
      await db.prepare(
        `UPDATE call_queue SET status = 'rejected', verified = 0, completed_at = datetime('now') WHERE id = ?`,
      )
    ).run(id);
  }

  const updated: any = await (
    await db.prepare("SELECT * FROM call_queue WHERE id = ?")
  ).get(id);
  res.json({ verified, call: updated });
});

// Define a route for the API endpoint that allows marking an in-progress call as completed (bypass IVR verify flow)
app.patch("/api/queue/:id/complete", async (req, res) => {
  const { id } = req.params;
  await (
    await db.prepare(
      `UPDATE call_queue SET status = 'completed', completed_at = datetime('now') WHERE id = ? AND status = 'in-progress'`,
    )
  ).run(id);
  const call: any = await (
    await db.prepare("SELECT * FROM call_queue WHERE id = ?")
  ).get(id);
  if (!call) return res.status(404).json({ error: "Call not found" });
  res.json({ call: call });
});

// Start the server only when running locally (not in a serverless environment)
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Export the Express application for use in Vercel Serverless Functions
export default app;
