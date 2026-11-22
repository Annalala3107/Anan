import { NextRequest, NextResponse } from 'next/server';
import { resolveCors } from '@/lib/corsServer';

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function normalizeYouTubeUrl(rawInput: string): string | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed || trimmed.length > 500) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`;
  }

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_YOUTUBE_HOSTS.has(host)) {
      return null;
    }
    return `https://${host}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = resolveCors(req, {
    methods: 'GET, OPTIONS',
    allowedHeaders: 'Content-Type',
  });
  if (!cors.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Origin không được phép truy cập.' },
      { status: 403, headers: cors.headers }
    );
  }
  return new NextResponse(null, { status: 204, headers: cors.headers });
}

export async function GET(req: NextRequest) {
  const cors = resolveCors(req, {
    methods: 'GET, OPTIONS',
    allowedHeaders: 'Content-Type',
  });
  if (!cors.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Origin không được phép truy cập.' },
      { status: 403, headers: cors.headers }
    );
  }

  const rawUrl = req.nextUrl.searchParams.get('url') || '';
  const targetUrl = normalizeYouTubeUrl(rawUrl);

  if (!targetUrl) {
    return NextResponse.json(
      { ok: false, error: 'URL YouTube không hợp lệ.' },
      { status: 400, headers: cors.headers }
    );
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      targetUrl
    )}&format=json`;

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const title =
        typeof data?.title === 'string' && data.title.trim()
          ? data.title.trim()
          : undefined;
      const artist =
        typeof data?.author_name === 'string' && data.author_name.trim()
          ? data.author_name.trim()
          : undefined;
      const thumbnail =
        typeof data?.thumbnail_url === 'string' ? data.thumbnail_url : undefined;

      if (title) {
        return NextResponse.json(
          {
            ok: true,
            title,
            artist,
            thumbnail,
          },
          { headers: cors.headers }
        );
      }
    }
  } catch {
    // Fall through gracefully
  }

  return NextResponse.json({ ok: false }, { headers: cors.headers });
}
