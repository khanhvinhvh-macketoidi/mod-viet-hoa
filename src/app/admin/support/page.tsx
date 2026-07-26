import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getDonationAdminOverview } from '@/lib/donations';

export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  PROCESSING: 'Đang xử lý',
  MATCHED: 'Đã đối soát',
  UNMATCHED: 'Chưa khớp token',
  IGNORED: 'Đã bỏ qua',
  PENDING_AUTOMATION: 'Chờ kiểm tra',
} as const;

export default async function AdminSupportPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login?next=/admin/support');
  if (user.role !== 'ADMIN') redirect('/');

  const { transactions, monthly } = await getDonationAdminOverview();
  const warning =
    monthly.incomingCount >= monthly.freeLimit
      ? 'Đã chạm hạn mức miễn phí'
      : monthly.incomingCount >= monthly.freeLimit - 5
        ? 'Gần chạm hạn mức'
        : 'Bình thường';

  return (
    <main className="min-h-screen bg-[#030a14] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[.16em] text-[#36d7ff]">
              Quản trị ủng hộ
            </span>
            <h1 className="mt-2 text-3xl font-black">Đối soát SePay</h1>
            <p className="mt-2 text-[#829bad]">
              Giao dịch tháng {monthly.monthKey}: {monthly.incomingCount}/
              {monthly.freeLimit} · {warning}
            </p>
          </div>
          <Link
            href="/support"
            className="rounded-xl border border-[#36d7ff]/20 px-4 py-2 text-sm font-bold text-[#bcefff]"
          >
            Mở trang ủng hộ
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#36d7ff]/12 bg-[#071321]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0b1c2d] text-[#7f9aab]">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Token/User</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 150).map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[#36d7ff]/8 align-top"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[#9cb0be]">
                    {item.transactionDate}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-black text-[#ffe0a5]">
                    {new Intl.NumberFormat('vi-VN').format(item.amount)}đ
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-[#9fe8ff]">
                      {item.token || '—'}
                    </div>
                    <div className="mt-1 text-xs text-[#637f92]">
                      {item.userId || 'Chưa xác định'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#b9d7e8]">
                    {STATUS_LABELS[item.status]}
                  </td>
                  <td className="max-w-md px-4 py-3 text-[#839dac]">
                    {item.content || item.description || '—'}
                    {item.note && (
                      <div className="mt-1 text-xs text-[#e9aa7d]">
                        {item.note}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[#6f899a]"
                  >
                    Chưa có giao dịch SePay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
