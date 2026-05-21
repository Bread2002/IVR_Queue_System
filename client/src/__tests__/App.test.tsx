// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 21st, 2026
// Description: Unit tests for the frontend of the IVR Queue Management System.
//              Uses Vitest and React Testing Library to render the App component and verify that it displays the expected UI elements and behavior.

// Import necessary testing utilities from Vitest and React Testing Library
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseTs, waitedMinutes } from "../utils";
import App from "../App";

// Mock the Auth0 hook so tests can control auth state without a real tenant or Auth0Provider
vi.mock("@auth0/auth0-react", () => ({ useAuth0: vi.fn() }));
import { useAuth0 } from "@auth0/auth0-react";

// Silence fetch calls made by useEffect on mount; return the wrapped shapes the API now uses
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ departments: [], calls: [] }),
    }),
  );

  // Default auth state: not authenticated
  vi.mocked(useAuth0).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
  } as any);
});

// Outline a test suite for the `parseTs` utility function
describe("parseTs", () => {
  // Test that a standard SQLite timestamp is correctly parsed as UTC milliseconds
  it("parses a SQLite timestamp as UTC milliseconds", () => {
    const ms = parseTs("2026-05-20 10:00:00");
    expect(ms).toBe(new Date("2026-05-20T10:00:00Z").getTime());
  });

  // Test that the returned value is a valid number (not NaN)
  it("returns a valid (non-NaN) number", () => {
    const ms = parseTs("2026-01-01 00:00:00");
    expect(typeof ms).toBe("number");
    expect(isNaN(ms)).toBe(false);
  });
});

// Outline a test suite for the `waitedMinutes` utility function
describe("waitedMinutes", () => {
  // Test that a just-created timestamp returns at least 1 minute of wait time
  it("returns at least 1 for a just-created timestamp", () => {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    expect(waitedMinutes(now)).toBeGreaterThanOrEqual(1);
  });

  // Test that an older timestamp returns a larger number of waited minutes
  it("returns a larger value for an older timestamp", () => {
    expect(waitedMinutes("2020-01-01 00:00:00")).toBeGreaterThan(100);
  });
});

// Outline a test suite for the Main App component
describe("App", () => {
  // Test that the Submit Call form and a Log In button are shown when the user is not authenticated
  it("shows the Submit Call form and Log In button when not authenticated", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /IVR Queue System/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Issue Description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
  });

  // Test that the Agent Dashboard and a Log Out button are shown when the user is authenticated
  it("shows the Agent Dashboard and Log Out button when authenticated", () => {
    // Mock the auth state to be authenticated for this test
    vi.mocked(useAuth0).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect: vi.fn(),
      logout: vi.fn(),
    } as any);

    // Re-render the App component with the updated auth state
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /Agent Dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Log Out/i }),
    ).toBeInTheDocument();
  });
});
