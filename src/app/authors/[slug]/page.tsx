import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorStats } from '@/lib/author-stats';
import { getModsByAuthorId } from '@/lib/mods';
import {
  getPublicUserByProfileSlug,
  getUserAvatar,
  getUserDisplayName,
} from '@/lib/users';
import AuthorCenter from '@/components/author-center/AuthorCenter';
import ModCard from '@/components/ModCard';
import { absoluteUrl, compactDescription, safeJsonLd } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getPublicUserByProfileSlug(slug);

  if (!author) {
    return { title: 'Không tìm thấy tác giả' };
  }

  const name = getUserDisplayName(author);

  return {
    title: `${name} — Tác giả`,
    description: compactDescription(
      author.profile?.bio?.trim() ||
        `Trang tác giả của ${name} trên MOD Việt Hóa.`,
    ),
    alternates: {
      canonical: `/authors/${author.profileSlug}`,
    },
    openGraph: {
      title: `${name} — Tác giả MOD Thư Viện`,
      description:
        compactDescription(
          author.profile?.bio?.trim() ||
            `Khám phá mod và hoạt động của ${name}.`,
        ),
      images: [
        absoluteUrl(author.profile?.coverImage || getUserAvatar(author)),
      ],
    },
  };
}

export default async function PublicAuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const [author, viewer] = await Promise.all([
    getPublicUserByProfileSlug(slug),
    getCurrentUser(),
  ]);

  if (!author) {
    notFound();
  }

  const [mods, stats] = await Promise.all([
    getModsByAuthorId(author.id),
    getAuthorStats(author.id),
  ]);

  const displayName = getUserDisplayName(author);
  const profilePath = `/authors/${author.profileSlug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      url: absoluteUrl(profilePath),
      image: absoluteUrl(getUserAvatar(author)),
      description:
        author.profile?.bio?.trim() ||
        `Trang tác giả của ${displayName} trên MOD Thư Viện.`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <AuthorCenter
        user={author}
        stats={stats}
        avatar={getUserAvatar(author)}
        isOwner={viewer?.id === author.id}
        variant="public"
        profileSlug={author.profileSlug}
        mods={
        mods.length > 0 ? (
          <div className="author-mods-grid">
            {mods.map((mod) => (
              <ModCard key={mod.id} mod={mod} />
            ))}
          </div>
        ) : (
          <div className="author-empty">
            Tác giả chưa công bố mod nào.
          </div>
        )
        }
      />
    </>
  );
}
