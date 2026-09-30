// Next.js provides a virtual "server-only" module at build time that throws
// if imported from client code. It has no real npm package, so it doesn't
// resolve under Vitest's plain Node/Vite resolution — this stub replaces it
// for tests only (aliased in vitest.config.ts), where "server-only" has no
// meaning anyway.
export {};
