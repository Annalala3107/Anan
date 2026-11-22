import { NextRequest } from 'next/server';

export interface CorsConfig {
  methods?: string;
  allowedHeaders?: string;
}

export function getAllowedOrigins(req: NextRequest): Set<string> {
  const allowed = new Set<string>();

  if (req.nextUrl?.origin) {
    allowed.add(req.nextUrl.origin);
  }

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      allowed.add(new URL(configuredUrl).origin);
    } catch {
      // Ignore malformed env URL
    }
  }

  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  for (const host of vercelHosts) {
    const clean = host?.trim();
    if (clean) {
      try {
        allowed.add(clean.startsWith('http') ? new URL(clean).origin : `https://${clean}`);
      } catch {
        // Ignore malformed host
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed;
}

/**
 * Resolves origin-checked CORS + no-store cache headers for API endpoints.
 */
export function resolveCors(
  req: NextRequest,
  config: CorsConfig = {}
): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  const methods = config.methods ?? 'POST, OPTIONS';
  const allowedHeaders = config.allowedHeaders ?? 'Content-Type';
  const origin = req.headers.get('origin');
  const baseHeaders: Record<string, string> = {
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };

  if (!origin) {
    return { allowed: true, headers: baseHeaders };
  }

  const allowedOrigins = getAllowedOrigins(req);
  if (!allowedOrigins.has(origin)) {
    return { allowed: false, headers: baseHeaders };
  }

  return {
    allowed: true,
    headers: {
      ...baseHeaders,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': allowedHeaders,
    },
  };
}
