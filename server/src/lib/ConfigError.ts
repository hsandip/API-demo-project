// Thrown when required configuration (env vars) is missing, as opposed to a
// generic bug — server.ts catches this specifically to print a short,
// actionable message instead of a raw stack trace, and exits cleanly rather
// than crashing. Kept in its own module (no other imports) so it can be
// imported statically without triggering env validation as a side effect.
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}
