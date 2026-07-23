import { redirect } from 'next/navigation';

import CreatorAnalyticsOverview from '@/components/creator/CreatorAnalyticsOverview';
import { getCurrentUser } from '@/lib/auth';
import {
  getCreatorAnalyticsOverview,
  recordCreatorAnalyticsSnapshot,
} from '@/lib/creator-analytics';

export const dynamic = 'force-dynamic';

export default async function CreatorAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'MODDER') redirect('/');

  const overview = await getCreatorAnalyticsOverview(user);
  const data = await recordCreatorAnalyticsSnapshot(user, overview);

  return <CreatorAnalyticsOverview data={data} />;
}
