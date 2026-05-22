// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 21st, 2026
// Description: React frontend for the IVR Queue Management System.
//              Public-facing Submit Call form; agent dashboard accessible after Auth0 login.

// Import React, Auth0, and necessary utilities
import { useState, useEffect } from "react";
import type { SyntheticEvent } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./App.css";
import { parseTs, waitedMinutes } from "./utils";

// Define a type for the call details returned from the API
type QueueCall = {
  id: number;
  account_number: string;
  caller_name: string | null;
  department: string;
  issue: string;
  status: "waiting" | "in-progress" | "completed" | "rejected";
  verified: number | null;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  created_at: string;
  answered_at: string | null;
  completed_at: string | null;
  position: number | null;
  estimated_wait: number | null;
};

// Define a type for the result returned after submitting a call (call fields are flattened alongside position/wait)
type SubmitResult = QueueCall & {
  position: number;
  estimated_wait: number;
};

// Define a constant for the API base URL
// In development, VITE_API_URL can point to http://localhost:3000.
// In production (Vercel), leave it unset so requests are relative (same origin).
const API = import.meta.env.VITE_API_URL ?? "";

// Main App
function App() {
  // Define Auth0 hooks for authentication state and actions
  const { isAuthenticated, loginWithRedirect, logout, isLoading } = useAuth0();

  // Define state variables for managing UI state and data
  const [departments, setDepartments] = useState<string[]>([]);
  const [form, setForm] = useState({
    accountNumber: "",
    department: "",
    issue: "",
  });
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<QueueCall[]>([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [queueLoading, setQueueLoading] = useState(false);

  // Load department list once on mount
  useEffect(() => {
    fetch(`${API}/api/departments`) // Fetch the list of departments from the API
      .then((r) => r.json()) // Parse the response as JSON
      .then((data) => setDepartments(data)) // Update the state with the list of departments
      .catch(console.error); // Log any errors to the console
  }, []);

  // Load the queue whenever the user authenticates
  useEffect(() => {
    if (isAuthenticated) loadQueue();
  }, [isAuthenticated]);

  // Define a helper function to load the queue data from the API
  async function loadQueue() {
    setQueueLoading(true); // Set loading state to true while fetching data
    try {
      const r = await fetch(`${API}/api/queue?status=waiting,in-progress`); // Submit a GET request for the queue data
      if (!r.ok) throw new Error(`HTTP Error ${r.status}`); // Throw an error if the response is not OK
      setQueue(await r.json()); // Update the state with the fetched queue data
    } catch (err) {
      console.error(err);
    } finally {
      // Log any errors to the console
      setQueueLoading(false);
    } // Set loading state back to false after the fetch is complete
  }

  // Define a helper function to handle form submission for joining the queue
  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault(); // Prevent the default form submission behavior
    setLoading(true); // Set submission loading state to true while submitting the form
    setSubmitResult(null); // Clear any previous submission results
    try {
      const r = await fetch(`${API}/api/queue`, {
        // Submit a POST request to the API to submit a new call to the queue
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP Error ${r.status}`); // Throw an error if the response is not OK
      setSubmitResult(await r.json()); // Update the state with the result of the submission
      setForm({ accountNumber: "", department: "", issue: "" }); // Clear the form fields
    } catch (err) {
      console.error(err);
    } finally {
      // Log any errors to the console
      setLoading(false);
    } // Set submission loading state back to false after the submission is complete
  }

  // Define a helper function to handle answering a call from the dashboard
  async function handleAnswer(id: number) {
    await fetch(`${API}/api/queue/${id}/verify?verified=true`, { method: "PATCH" }); // Submit a PATCH request to the API to mark the call as answered
    loadQueue(); // Reload the queue data to reflect the updated status of the call
  }

  // Define a helper function to handle completing a call from the dashboard
  async function handleComplete(id: number) {
    await fetch(`${API}/api/queue/${id}/complete`, { method: "PATCH" }); // Submit a PATCH request to the API to mark the call as completed
    loadQueue(); // Reload the queue data to reflect the updated status of the call
  }

  // Define a variable for the calls that should be visible based on the current department filter, sorted by status and creation time
  const visibleCalls = queue
    .filter((c) => deptFilter === "all" || c.department === deptFilter)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "waiting" ? -1 : 1;
      return parseTs(a.created_at) - parseTs(b.created_at);
    });

  return (
    <>
      {/* ── Header ── */}
      <header className="app-header">
        <span className="app-title">IVR Queue System</span>
        <button
          className="auth-btn"
          disabled={isLoading}
          onClick={() =>
            isAuthenticated
              ? logout({ logoutParams: { returnTo: window.location.origin } })
              : loginWithRedirect()
          }
        >
          {isLoading ? "…" : isAuthenticated ? "Log Out" : "Log In"}
        </button>
      </header>

      {/* ── Agent Dashboard (authenticated) ── */}
      {isAuthenticated && (
        <section id="center">
          <div>
            <h1>Agent Dashboard</h1>
            <p>Active and waiting calls across all departments.</p>
          </div>

          <div className="dash-controls">
            {["all", ...departments].map((d) => (
              <button
                key={d}
                className={`filter-btn${deptFilter === d ? " filter-btn--active" : ""}`}
                onClick={() => setDeptFilter(d)}
              >
                {d === "all" ? "All" : d}
              </button>
            ))}
            <button
              className="refresh-btn"
              onClick={loadQueue}
              disabled={queueLoading}
            >
              {queueLoading ? "…" : "↻ Refresh"}
            </button>
          </div>

          <div className="queue-list">
            {visibleCalls.length === 0 ? (
              <p className="queue-empty">
                No active calls{deptFilter !== "all" ? ` in ${deptFilter}` : ""}
                .
              </p>
            ) : (
              visibleCalls.map((call) => (
                <div
                  key={call.id}
                  className={`queue-card queue-card--${call.status}`}
                >
                  <div className="qc-header">
                    <span className="qc-account">
                      {call.caller_name ?? call.account_number}
                      <span className="qc-acctnum">
                        {" "}
                        · {call.account_number}
                      </span>
                    </span>
                    <span
                      className={`dept-badge dept-badge--${call.department.toLowerCase()}`}
                    >
                      {call.department}
                    </span>
                    <span
                      className={`status-badge status-badge--${call.status}`}
                    >
                      {call.status}
                    </span>
                  </div>

                  <p className="qc-issue">{call.issue}</p>

                  <div className="qc-footer">
                    <span className="qc-agent">
                      → {call.assigned_agent_name ?? "Unassigned"}
                    </span>
                    {call.status === "waiting" && call.position != null && (
                      <span className="qc-pos">
                        #{call.position} · waiting{" "}
                        {waitedMinutes(call.created_at)}m
                      </span>
                    )}
                    <div className="qc-actions">
                      {call.status === "waiting" && (
                        <button
                          className="action-btn action-btn--answer"
                          onClick={() => handleAnswer(call.id)}
                        >
                          Answer
                        </button>
                      )}
                      {call.status === "in-progress" && (
                        <button
                          className="action-btn action-btn--complete"
                          onClick={() => handleComplete(call.id)}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ── Submit Call (public) ── */}
      {!isAuthenticated && (
        <section id="center">
          <div>
            <h1>IVR Queue System</h1>
            <p>Enter your details to join the support queue.</p>
          </div>

          {!submitResult ? (
            <form className="routing-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="accountNumber">Account Number</label>
                <input
                  id="accountNumber"
                  type="text"
                  placeholder="e.g. ACC-1003"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountNumber: e.target.value }))
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  value={form.department}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value }))
                  }
                >
                  <option value="">Select a department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="issue">Issue Description</label>
                <textarea
                  id="issue"
                  rows={4}
                  placeholder="Briefly describe your issue…"
                  value={form.issue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issue: e.target.value }))
                  }
                />
              </div>

              <button type="submit" className="button-icon" disabled={loading}>
                {loading ? "Joining Queue…" : "Join Queue"}
              </button>
            </form>
          ) : (
            <div className="confirmation-card">
              <p className="confirm-icon">✓</p>
              <h2>You're in the queue</h2>
              <p className="confirm-dept">{submitResult.department}</p>
              <div className="confirm-stats">
                <div>
                  <span className="stat-label">Position</span>
                  <span className="stat-value">#{submitResult.position}</span>
                </div>
                <div>
                  <span className="stat-label">Est. Wait</span>
                  <span className="stat-value">
                    ~{submitResult.estimated_wait} min
                  </span>
                </div>
              </div>
              <p className="confirm-agent">
                Assigned to{" "}
                <strong>
                  {submitResult.assigned_agent_name ?? "Next available agent"}
                </strong>
              </p>
              <button
                className="button-icon"
                onClick={() => setSubmitResult(null)}
              >
                Submit Another Call
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default App;
