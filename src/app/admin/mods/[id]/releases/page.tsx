import {
  notFound,
  redirect,
} from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getMods,
} from '@/lib/mods';
import {
  ensureCurrentVersion,
  getVersionsByModId,
} from '@/lib/mod-versions';
import { getDependenciesByModId } from '@/lib/mod-dependencies';
import ReleaseManager from '@/components/versions/ReleaseManager';

export default async function ReleasesPage({
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

  await ensureCurrentVersion(
    mod,
    user.id,
  );

  const [
    versions,
    dependencies,
    allMods,
  ] = await Promise.all([
    getVersionsByModId(mod.id),
    getDependenciesByModId(mod.id),
    getMods(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
        Milestone 12
      </p>

      <h1 className="mt-2 text-4xl font-black">
        Quản lý phát hành
      </h1>

      <p className="mt-2 mb-8 text-slate-400">
        {mod.title}
      </p>

      <ReleaseManager
        mod={mod}
        versions={versions}
        dependencies={dependencies}
        availableMods={allMods
          .filter(
            (item) => item.id !== mod.id,
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
          }))}
      />
    </main>
  );
}
