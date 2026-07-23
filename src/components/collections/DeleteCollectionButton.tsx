'use client';

import { useRouter } from 'next/navigation';

export default function DeleteCollectionButton({
  collectionId,
}: {
  collectionId: string;
}) {
  const router = useRouter();

  async function remove() {
    if (
      !window.confirm(
        'Xóa Tàng Kinh Các này? Các mod sẽ không bị xóa.',
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/collections/${collectionId}`,
      {
        method: 'DELETE',
      },
    );

    if (response.ok) {
      router.push('/profile/collections');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 font-semibold text-red-200"
    >
      Xóa Tàng Kinh Các
    </button>
  );
}
