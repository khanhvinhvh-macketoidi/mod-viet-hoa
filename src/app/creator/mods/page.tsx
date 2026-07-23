import { redirect } from 'next/navigation';

import CreatorWorkspace from '@/components/creator/CreatorWorkspace';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorWorkspaceData } from '@/lib/creator-workspace';

export const dynamic = 'force-dynamic';

export default async function CreatorModsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ADMIN' && user.role !== 'MODDER') {
    redirect('/');
  }

  const data = await getCreatorWorkspaceData(user);

  return <CreatorWorkspace data={data} />;
}
