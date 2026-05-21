/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Force Jest to exit after all tests complete — the Turso HTTP client
  // keeps connections alive which would otherwise cause Jest to hang.
  forceExit: true,
  moduleNameMapper: {
    // Redirect the Turso remote client to the in-memory SQLite stub for tests.
    // This rule must come first so it wins over the .js-stripping rule below.
    '^(\\./|\\.\\./)+turso-db(\\.js)?$': '<rootDir>/test-db',
    // Strip .js extensions from all other imports so Jest resolves .ts source files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      // Override to CommonJS so Jest's test runner works — the package is
      // "type: module" but ts-jest compiles each file to CJS for the test env
      tsconfig: { module: 'CommonJS', moduleResolution: 'node' },
    }],
  },
}
