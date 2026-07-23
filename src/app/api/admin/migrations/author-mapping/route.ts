import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMods, saveMods } from '@/lib/mods';
import {
  getUserDisplayName,
  getUsers,
} from '@/lib/users';

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getTokens(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function scoreUser(
  authorText: string,
  userName: string,
  displayName: string,
): number {
  const author = normalizeSearchText(authorText);
  const account = normalizeSearchText(userName);
  const display = normalizeSearchText(displayName);

  if (!author || (!account && !display)) {
    return 0;
  }

  if (author === account || author === display) {
    return 100;
  }

  if (
    (account && author.includes(account)) ||
    (display && author.includes(display))
  ) {
    return 92;
  }

  const authorTokens = new Set(getTokens(authorText));
  const userTokens = new Set([
    ...getTokens(userName),
    ...getTokens(displayName),
  ]);

  if (authorTokens.size === 0 || userTokens.size === 0) {
    return 0;
  }

  let matched = 0;

  for (const token of userTokens) {
    if (authorTokens.has(token)) {
      matched += 1;
    }
  }

  const tokenScore = Math.round(
    (matched / Math.max(userTokens.size, 1)) * 80,
  );

  const compactAuthor = author.replace(/\s+/g, '');
  const compactAccount = account.replace(/\s+/g, '');
  const compactDisplay = display.replace(/\s+/g, '');

  const compactBonus =
    (compactAccount && compactAuthor.includes(compactAccount)) ||
    (compactDisplay && compactAuthor.includes(compactDisplay))
      ? 12
      : 0;

  return Math.min(90, tokenScore + compactBonus);
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          ok: false,
          message: 'Đạo hữu cần đăng nhập.',
        },
        { status: 401 },
      ),
    };
  }

  if (user.role !== 'ADMIN') {
    return {
      user: null,
      response: NextResponse.json(
        {
          ok: false,
          message: 'Đạo hữu không có quyền thực hiện thao tác này.',
        },
        { status: 403 },
      ),
    };
  }

  return {
    user,
    response: null,
  };
}

export async function GET() {
  const auth = await requireAdmin();

  if (auth.response) {
    return auth.response;
  }

  try {
    const [mods, users] = await Promise.all([
      getMods(),
      getUsers(),
    ]);

    const publicUsers = users
      .filter((user) => user.isActive !== false)
      .map((user) => ({
        id: user.id,
        name: user.name,
        displayName: getUserDisplayName(user),
        profileSlug: user.profileSlug ?? '',
        role: user.role,
        avatar: user.profile?.avatar,
      }))
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'vi'),
      );

    const pendingMods = mods
      .filter((mod) => !mod.authorId)
      .map((mod) => {
        const suggestions = publicUsers
          .map((user) => ({
            user,
            score: scoreUser(
              mod.author ?? '',
              user.name,
              user.displayName,
            ),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        return {
          id: mod.id,
          title: mod.title,
          slug: mod.slug,
          author: mod.author,
          coverUrl: mod.coverUrl,
          suggestions,
        };
      })
      .sort((a, b) =>
        a.title.localeCompare(b.title, 'vi'),
      );

    return NextResponse.json({
      ok: true,
      pendingMods,
      users: publicUsers,
      totalMods: mods.length,
      linkedMods: mods.filter((mod) => Boolean(mod.authorId))
        .length,
      pendingCount: pendingMods.length,
    });
  } catch (error) {
    console.error(
      'Không thể đọc dữ liệu Author Mapping:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message: 'Không thể đọc Author Mapping.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth.response || !auth.user) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as {
      modId?: unknown;
      userId?: unknown;
    };

    const modId =
      typeof body.modId === 'string'
        ? body.modId.trim()
        : '';

    const userId =
      typeof body.userId === 'string'
        ? body.userId.trim()
        : '';

    if (!modId || !userId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Thiếu modId hoặc userId.',
        },
        { status: 400 },
      );
    }

    const [mods, users] = await Promise.all([
      getMods(),
      getUsers(),
    ]);

    const modIndex = mods.findIndex(
      (mod) => mod.id === modId,
    );

    const selectedUser = users.find(
      (user) => user.id === userId,
    );

    if (modIndex < 0) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Không tìm thấy bí tịch cần liên kết.',
        },
        { status: 404 },
      );
    }

    if (!selectedUser || selectedUser.isActive === false) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Không tìm thấy tài khoản hợp lệ.',
        },
        { status: 404 },
      );
    }

    if (mods[modIndex].authorId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Mod này đã có authorId.',
        },
        { status: 409 },
      );
    }

    mods[modIndex] = {
      ...mods[modIndex],
      authorId: selectedUser.id,
      updatedAt: new Date().toISOString(),
    };

    await saveMods(mods);

    console.info('Admin linked mod author:', {
      adminUserId: auth.user.id,
      modId,
      authorId: selectedUser.id,
    });

    return NextResponse.json({
      ok: true,
      message: `Đã liên kết "${mods[modIndex].title}" với ${getUserDisplayName(
        selectedUser,
      )}.`,
      mod: {
        id: mods[modIndex].id,
        authorId: selectedUser.id,
      },
    });
  } catch (error) {
    console.error(
      'Không thể liên kết tác giả mod:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể liên kết tác giả mod.',
      },
      { status: 500 },
    );
  }
}
