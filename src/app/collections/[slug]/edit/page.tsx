import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCollectionBySlug } from '@/lib/collections';
import CollectionForm from '@/components/collections/CollectionForm';
import DeleteCollectionButton from '@/components/collections/DeleteCollectionButton';

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { slug } = await params;
  const collection =
    await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  if (
    collection.ownerId !== user.id &&
    user.role !== 'ADMIN'
  ) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-4xl font-black">
        Chỉnh sửa Tàng Kinh Các
      </h1>

      <div className="mt-8">
        <CollectionForm
          collectionId={collection.id}
          initialTitle={collection.title}
          initialDescription={
            collection.description
          }
          initialVisibility={
            collection.visibility
          }
        />
      </div>

      {collection.ownerId === user.id && (
        <div className="mt-5">
          <DeleteCollectionButton
            collectionId={collection.id}
          />
        </div>
      )}
    </main>
  );
}
