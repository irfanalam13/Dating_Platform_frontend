// Dev-only logger. No-ops in production so debug output never ships to users'
// consoles (and never leaks tokens / response shapes there).
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    if (isDev) console.error(...args);
  },
};
