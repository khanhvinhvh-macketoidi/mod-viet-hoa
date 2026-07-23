import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getNotificationPreferences } from '@/lib/notification-preferences';
import NotificationPreferencesForm from '@/components/notifications/NotificationPreferencesForm';

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile/settings');
  }

  const preferences =
    await getNotificationPreferences(user.id);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profile"
          className="text-sm font-semibold text-amber-300 hover:text-amber-200"
        >
          ← Quay lại đạo tịch
        </Link>

        <header className="mb-8 mt-5">
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
            Profile · Settings
          </span>
          <h1 className="mt-2 text-4xl font-black">
            Cài đặt truyền âm
          </h1>
          <p className="mt-3 leading-7 text-slate-400">
            Chọn những hoạt động đạo hữu muốn nhận qua chuông truyền âm và popup trực tuyến.
          </p>
        </header>

        <NotificationPreferencesForm
          initialPreferences={preferences}
        />
      </div>
    </main>
  );
}
