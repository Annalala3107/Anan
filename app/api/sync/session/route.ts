import { randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { resolveCors } from '@/lib/corsServer';
import { BackupDataSchema } from '@/lib/schema';

interface SyncRecord {
  data: unknown;
  createdAt: number;
  expiresAt: number;
}

const SYNC_TTL_SECONDS = 15 * 60; // 15 minutes
const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB cap to protect Serverless & Redis limits
const REDIS_KEY_PREFIX = 'ananquiz:sync:';

function getRedisClient(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function resolveSyncCors(req: NextRequest) {
  return resolveCors(req, {
    methods: 'GET, POST, OPTIONS',
    allowedHeaders: 'Content-Type',
  });
}

export async function OPTIONS(req: NextRequest) {
  const cors = resolveSyncCors(req);
  if (!cors.allowed) {
    return NextResponse.json(
      { error: 'Origin không được phép truy cập.' },
      { status: 403, headers: cors.headers }
    );
  }
  return new NextResponse(null, { status: 204, headers: cors.headers });
}

/**
 * POST /api/sync/session
 * Validates and stores a short-lived backup payload in Upstash Redis (15-minute TTL)
 * and returns a one-time 6-digit transfer PIN.
 */
export async function POST(req: NextRequest) {
  const cors = resolveSyncCors(req);
  if (!cors.allowed) {
    return NextResponse.json(
      { error: 'Origin không được phép tạo phiên chuyển dữ liệu.' },
      { status: 403, headers: cors.headers }
    );
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json(
      {
        error:
          'Máy chủ chưa cấu hình Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) để cấp mã PIN 15 phút.',
        code: 'REDIS_NOT_CONFIGURED',
      },
      { status: 503, headers: cors.headers }
    );
  }

  try {
    const contentLengthHeader = req.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          { error: 'Dữ liệu sao lưu vượt quá giới hạn tối đa 512 KB.' },
          { status: 413, headers: cors.headers }
        );
      }
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Dữ liệu sao lưu vượt quá giới hạn tối đa 512 KB.' },
        { status: 413, headers: cors.headers }
      );
    }

    let body: { payload?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Nội dung gửi lên không đúng định dạng JSON hợp lệ.' },
        { status: 400, headers: cors.headers }
      );
    }

    const rawPayload = body?.payload;
    if (!rawPayload) {
      return NextResponse.json(
        { error: 'Dữ liệu sao lưu không được để trống.' },
        { status: 400, headers: cors.headers }
      );
    }

    const payloadJsonStr =
      typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

    if (Buffer.byteLength(payloadJsonStr, 'utf8') > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: 'Gói sao lưu vượt quá giới hạn 512 KB để chuyển qua PIN.' },
        { status: 413, headers: cors.headers }
      );
    }

    let parsedPayload: unknown;
    try {
      parsedPayload =
        typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu sao lưu bên trong payload không hợp lệ.' },
        { status: 400, headers: cors.headers }
      );
    }

    const schemaCheck = BackupDataSchema.safeParse(parsedPayload);
    if (!schemaCheck.success) {
      return NextResponse.json(
        { error: 'Cấu trúc dữ liệu sao lưu AnanQuiz không hợp lệ.' },
        { status: 422, headers: cors.headers }
      );
    }

    const now = Date.now();
    const record: SyncRecord = {
      data: schemaCheck.data,
      createdAt: now,
      expiresAt: now + SYNC_TTL_SECONDS * 1000,
    };

    let code = '';
    let reserved = false;

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = randomInt(100000, 1000000).toString();
      const setResult = await redis.set(
        `${REDIS_KEY_PREFIX}${candidate}`,
        JSON.stringify(record),
        { ex: SYNC_TTL_SECONDS, nx: true }
      );
      if (setResult === 'OK') {
        code = candidate;
        reserved = true;
        break;
      }
    }

    if (!reserved || !code) {
      return NextResponse.json(
        { error: 'Hệ thống đang bận tạo mã PIN, vui lòng thử lại.' },
        { status: 503, headers: cors.headers }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code,
        expiresAt: record.expiresAt,
        ttlSeconds: SYNC_TTL_SECONDS,
      },
      { headers: cors.headers }
    );
  } catch (err: unknown) {
    console.error('Error in POST /api/sync/session:', err);
    return NextResponse.json(
      { error: 'Không thể khởi tạo phiên chuyển dữ liệu qua QR / PIN.' },
      { status: 500, headers: cors.headers }
    );
  }
}

/**
 * GET /api/sync/session?code=123456
 * Atomically retrieves and deletes the 6-digit transfer code (one-time claim).
 */
export async function GET(req: NextRequest) {
  const cors = resolveSyncCors(req);
  if (!cors.allowed) {
    return NextResponse.json(
      { error: 'Origin không được phép nhận dữ liệu chuyển.' },
      { status: 403, headers: cors.headers }
    );
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json(
      {
        error:
          'Máy chủ chưa cấu hình Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).',
        code: 'REDIS_NOT_CONFIGURED',
      },
      { status: 503, headers: cors.headers }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim() || '';

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Mã PIN chuyển dữ liệu phải gồm đúng 6 chữ số.' },
        { status: 400, headers: cors.headers }
      );
    }

    // Atomic single-use claim: reads and immediately removes the key from Redis
    const rawRecord = await redis.getdel<SyncRecord | string>(`${REDIS_KEY_PREFIX}${code}`);

    if (!rawRecord) {
      return NextResponse.json(
        {
          error:
            'Mã PIN không tồn tại, đã được nhận trước đó hoặc đã hết hạn sau 15 phút. Vui lòng tạo mã QR mới trên thiết bị nguồn.',
        },
        { status: 404, headers: cors.headers }
      );
    }

    let record: SyncRecord | null = null;
    try {
      record =
        typeof rawRecord === 'string'
          ? (JSON.parse(rawRecord) as SyncRecord)
          : rawRecord;
    } catch {
      record = null;
    }

    if (!record || !record.data) {
      return NextResponse.json(
        { error: 'Gói dữ liệu chuyển bị hỏng hoặc không hợp lệ.' },
        { status: 500, headers: cors.headers }
      );
    }

    if (Date.now() > record.expiresAt) {
      return NextResponse.json(
        { error: 'Mã PIN đã hết hạn 15 phút. Vui lòng tạo mã mới.' },
        { status: 410, headers: cors.headers }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payload: record.data,
        transferredAt: new Date().toISOString(),
      },
      { headers: cors.headers }
    );
  } catch (err: unknown) {
    console.error('Error in GET /api/sync/session:', err);
    return NextResponse.json(
      { error: 'Không thể nhận dữ liệu chuyển từ máy chủ.' },
      { status: 500, headers: cors.headers }
    );
  }
}
