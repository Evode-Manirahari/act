// Resolved server-side. NEXT_PUBLIC_* is also exposed to client components.
export const ACT_API_BASE: string =
  process.env.NEXT_PUBLIC_ACT_API_BASE_URL ?? 'https://act-api-evode.fly.dev';
