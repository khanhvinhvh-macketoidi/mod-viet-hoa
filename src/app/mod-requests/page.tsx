import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { getPublicModRequests } from '@/lib/mod-requests';
import ModRequestsClient from './ModRequestsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Yêu Cầu Mod',
  description:
    'Nơi cộng đồng đề xuất mod, công cụ và bản Việt hóa mong muốn.',
};

export default async function ModRequestsPage() {
  const user = await getCurrentUser();
  const requests = await getPublicModRequests(user?.id);

  return (
    <ModRequestsClient
      initialRequests={requests}
      currentUser={
        user
          ? {
              id: user.id,
              role: user.role,
            }
          : null
      }
    />
  );
}
