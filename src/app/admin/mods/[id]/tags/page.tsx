import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import TagEditor from '@/components/tags/TagEditor';

export default async function EditModTagsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    notFound();
  }

  if (
    user.role !== 'ADMIN' &&
    mod.authorId !== user.id
  ) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
        Milestone 10
      </p>

      <h1 className="mt-2 text-4xl font-black">
        Quản lý tag
      </h1>

      <p className="mt-2 text-slate-400">
        {mod.title}
      </p>

      <form
        action={`/api/admin/mods/${mod.id}/tags`}
        method="post"
        className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <TagEditor
          initialTags={mod.tags ?? []}
        />

        <button
          type="submit"
          className="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
        >
          Lưu tag
        </button>
      </form>
    </main>
  );
}
