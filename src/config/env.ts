// File: env.ts
// Path: src/config/env.ts

const env = {
  NODE_ENV: process.env.NODE_ENV,
  /** Gateway origin — proxied through next.config rewrites as /api/proxy */
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  /** Same-origin base for every core-service call (cookies stay first-party). */
  API_BASE: '/api/proxy/core/api',
};

export default env;
