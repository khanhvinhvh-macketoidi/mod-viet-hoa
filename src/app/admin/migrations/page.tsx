import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AdminMigrationCenter from '@/components/AdminMigrationCenter';

export default async function AdminMigrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');

  return (
    <main style={{ minHeight: 'calc(100vh - 140px)', padding: '32px 20px 56px' }}>
      <div style={{ width: 'min(1120px, 100%)', margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.1 }}>
            Migration dữ liệu
          </h1>
          <p style={{ maxWidth: 760, margin: '10px 0 0', color: '#91a4c7', lineHeight: 1.7 }}>
            Kiểm tra migration User Profile, liên kết thủ công tác giả mod và theo dõi trạng thái dữ liệu.
          </p>
        </header>
        <AdminMigrationCenter />
      </div>
    </main>
  );
}
