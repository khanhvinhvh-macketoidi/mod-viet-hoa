import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import CreatorSidebar from '@/components/creator/CreatorSidebar';
import { getCurrentUser } from '@/lib/auth';

export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'MODDER') redirect('/');

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 2xl:px-10">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[270px_minmax(0,1fr)] xl:gap-8 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <CreatorSidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </section>
  );
}
