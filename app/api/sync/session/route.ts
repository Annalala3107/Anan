import { NextRequest, NextResponse } from 'next/server';

interface SyncRecord {
  data: any;
  createdAt: number;
  expiresAt: number;
}

// In-memory global store for ephemeral sync transfer (15-minute TTL)
// Declarations outside request handler persist across warm serverless requests
const syncStore = new Map<string, SyncRecord>();

// Helper to cleanup expired tokens periodically
function cleanExpiredRecords() {
  const now = Date.now();
  syncStore.forEach((record, code) => {
    if (record.expiresAt < now) {
      syncStore.delete(code);
    }
  });
}

// Generate a memorable 6-character transfer code (digits only for fast phone entry)
function generateSyncCode(): string {
  cleanExpiredRecords();
  let code = '';
  do {
    // Generate 6-digit code (e.g., 482915)
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (syncStore.has(code));
  return code;
}

/**
 * POST /api/sync/session
 * Saves a backup payload from PC and returns a 6-digit code for phone pickup
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { payload } = body;

    if (!payload) {
      return NextResponse.json(
        { error: 'Dữ liệu sao lưu không được để trống' },
        { status: 400 }
      );
    }

    const code = generateSyncCode();
    const now = Date.now();
    const ttlMs = 15 * 60 * 1000; // 15 minutes

    syncStore.set(code, {
      data: payload,
      createdAt: now,
      expiresAt: now + ttlMs,
    });

    return NextResponse.json({
      success: true,
      code,
      expiresAt: now + ttlMs,
      ttlSeconds: 900,
    });
  } catch (err: any) {
    console.error('Error in POST /api/sync/session:', err);
    return NextResponse.json(
      { error: 'Không thể khởi tạo phiên đồng bộ: ' + (err?.message || 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/session?code=123456
 * Retrieves the stored payload on phone and claims it
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim();

    if (!code) {
      return NextResponse.json(
        { error: 'Thiếu mã đồng bộ (code)' },
        { status: 400 }
      );
    }

    cleanExpiredRecords();
    const record = syncStore.get(code);

    if (!record) {
      return NextResponse.json(
        { error: 'Mã đồng bộ không tồn tại hoặc đã hết hạn sau 15 phút. Vui lòng quét lại mã QR trên máy tính.' },
        { status: 404 }
      );
    }

    if (Date.now() > record.expiresAt) {
      syncStore.delete(code);
      return NextResponse.json(
        { error: 'Mã đồng bộ đã hết hạn. Vui lòng tạo mã mới trên máy tính.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      payload: record.data,
      transferredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in GET /api/sync/session:', err);
    return NextResponse.json(
      { error: 'Không thể nhận dữ liệu đồng bộ: ' + (err?.message || 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
