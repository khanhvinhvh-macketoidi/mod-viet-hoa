import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getFavoriteCountMap,
  getFavoriteModIdsByUser,
} from '@/lib/favorites';
import { getMods } from '@/lib/mods';
import ModCard from '@/components/ModCard';

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile/favorites');
  }

  const [ids, mods, countMap] =
    await Promise.all([
      getFavoriteModIdsByUser(user.id),
      getMods(),
      getFavoriteCountMap(),
    ]);

  const byId = new Map(
    mods.map((mod) => [mod.id, mod]),
  );

  const favorites = ids
    .map((id) => byId.get(id))
    .filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-4xl font-black">
        Mod tâm đắc
      </h1>

      <p className="mt-2 text-slate-400">
        Những mod đạo hữu đã thu vào danh sách tâm đắc.
      </p>

      {favorites.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((mod) =>
            mod ? (
              <ModCard
                key={mod.id}
                mod={mod}
                favoriteCount={
                  countMap[mod.id] ?? 0
                }
              />
            ) : null,
          )}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
          Đạo hữu chưa có mod tâm đắc nào.
        </div>
      )}
    </main>
  );
}
