import { redirect } from 'next/navigation';

import CreatorFollowersCenter from '@/components/creator/CreatorFollowersCenter';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorFollowersData } from '@/lib/creator-followers';

export const dynamic = 'force-dynamic';

export default async function CreatorFollowersPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'MODDER') redirect('/');

  const data = await getCreatorFollowersData(user);

  return <CreatorFollowersCenter data={data} />;
}
