import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CollectionForm from '@/components/collections/CollectionForm';

type NewCollectionPageProps = {
  searchParams: Promise<{
    modId?: string;
    returnTo?: string;
  }>;
};

export default async function NewCollectionPage({
  searchParams,
}: NewCollectionPageProps) {
  const user = await getCurrentUser();
  const query = await searchParams;

  if (!user) {
    redirect(
      '/login?next=/profile/collections/new',
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-4xl font-black">
        Tạo Tàng Kinh Các
      </h1>
      <p className="mt-2 mb-8 text-slate-400">
        Tạo một nơi riêng để lưu và chia sẻ các mod liên quan.
      </p>

      <CollectionForm
        pendingModId={String(query.modId ?? '').trim()}
        returnTo={String(query.returnTo ?? '').trim()}
      />
    </main>
  );
}
