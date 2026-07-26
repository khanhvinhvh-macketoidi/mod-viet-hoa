import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getDonationMonthlyStats,
  getDonationSummary,
  getDonationTransferCode,
  getOrCreateDonationToken,
} from '@/lib/donations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const [token, summary, monthly] = await Promise.all([
    getOrCreateDonationToken(user.id),
    getDonationSummary(user),
    getDonationMonthlyStats(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      token: token.token,
      transferCode: getDonationTransferCode(token),
      summary,
      monthly,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
