// Copyright (c) 2026, Rye Stahle-Smith; All rights reserved.
// IVR Queue Management System
// Last Updated: May 20th, 2026
// Description: Utility functions for the IVR Queue Management System.

// Define a helper function to parse SQLite timestamps as UTC and return the time in milliseconds
export function parseTs(ts: string): number {
  // SQLite timestamps are 'YYYY-MM-DD HH:MM:SS' (no T, no Z) — must be parsed as UTC
  return new Date(ts.replace(' ', 'T') + 'Z').getTime()
}

// Define a helper function to calculate the number of minutes that have passed since a given timestamp
export function waitedMinutes(createdAt: string): number {
  return Math.max(1, Math.round((Date.now() - parseTs(createdAt)) / 60000))
}
