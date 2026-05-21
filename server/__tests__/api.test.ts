// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 21st, 2026
// Description: Unit tests for the backend of the IVR Queue Management System.
//              Uses supertest to make HTTP requests to the Express server and verifies responses for correctness.

// Import supertest
import request from "supertest";
// Import the Express app and db from the server
import app from "../index.js";
import db, { initPromise } from "../database.js";

// Wait for the in-memory SQLite database to be created and seeded before any test runs
beforeAll(() => initPromise);

// Close the SQLite connection cleanly after all tests complete
afterAll(async () => {
  await db.close();
});

// Outline a test suite for accessing the list of departments
describe("GET /api/departments", () => {
  it("returns an array of departments", async () => {
    const res = await request(app).get("/api/departments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain("Sales");
    expect(res.body).toContain("Support");
    expect(res.body).toContain("Billing");
  });
});

// Outline a test suite for accessing the list of calls in the queue
describe("GET /api/queue", () => {
  // Access the queue without filters and verify the structure of the response
  it("returns an array of call objects", async () => {
    const res = await request(app).get("/api/queue");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const call = res.body[0];
      expect(call).toHaveProperty("id");
      expect(call).toHaveProperty("status");
      expect(call).toHaveProperty("department");
    }
  });

  // Test that filtering by status works correctly
  it("filters by ?status= so only matching entries are returned", async () => {
    const res = await request(app).get("/api/queue?status=waiting");
    expect(res.status).toBe(200);
    for (const call of res.body) {
      expect(call.status).toBe("waiting");
    }
  });
});

// Outline a test suite for creating a new call in the queue
describe("POST /api/queue", () => {
  it("creates a call and returns position + estimated_wait", async () => {
    const res = await request(app)
      .post("/api/queue")
      .send({
        accountNumber: "TEST-001",
        department: "Sales",
        issue: "Unit test call",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("position");
    expect(res.body).toHaveProperty("estimated_wait");
    expect(typeof res.body.position).toBe("number");
    expect(res.body.department).toBe("Sales");
    expect(res.body.status).toBe("waiting");
  });
});

// Outline a test suite for accessing the next caller in the queue
describe("GET /api/queue/next", () => {
  it("returns 200 with full caller info or 404 when empty", async () => {
    const res = await request(app).get("/api/queue/next");
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body).toHaveProperty("account_number");
      expect(res.body).toHaveProperty("assigned_agent_name");
      expect(res.body.status).toBe("waiting");
    }
  });
});

// Outline a test suite for verifying a call in the queue
describe("PATCH /api/queue/:id/verify", () => {
  it("moves a waiting call to in-progress when verified=true", async () => {
    // Create a fresh call so we have a known waiting ID
    const post = await request(app)
      .post("/api/queue")
      .send({
        accountNumber: "TEST-002",
        department: "Billing",
        issue: "Verify test",
      });

    const id = post.body.id;

    const res = await request(app).patch(
      `/api/queue/${id}/verify?verified=true`,
    );
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.status).toBe("in-progress");
  });
});

// Outline a test suite for completing all testing calls (TEST-***) in the queue
describe("PATCH /api/queue/:id/complete", () => {
  // First, verify all waiting TEST calls to move them to in-progress
  it("moves all waiting calls to in-progress", async () => {
    // Get all waiting calls and filter to only TEST entries
    const waiting = await request(app).get("/api/queue?status=waiting");
    const testCalls = waiting.body.filter((call: any) =>
      call.account_number.includes("TEST"),
    );

    for (const call of testCalls) {
      // Verify each call to move it to in-progress
      const res = await request(app).patch(
        `/api/queue/${call.id}/verify?verified=true`,
      );
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("in-progress");
    }
  });

  // After all TEST calls are in-progress, complete them and verify the status changes to completed
  it("moves all in-progress calls to completed", async () => {
    // Get all in-progress calls and filter to only TEST entries
    const inProgress = await request(app).get("/api/queue?status=in-progress");
    const testCalls = inProgress.body.filter((call: any) =>
      call.account_number.includes("TEST"),
    );

    for (const call of testCalls) {
      // Complete each call
      const res = await request(app).patch(`/api/queue/${call.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("completed");
    }
  });
});
