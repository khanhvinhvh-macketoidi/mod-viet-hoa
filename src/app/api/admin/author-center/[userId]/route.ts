import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, saveUsers } from '@/lib/users';
import type { AvatarFrameTier, Role } from '@/lib/types';
import { createSafeRedirectUrl } from '@/lib/production/url';
import { isEligibleForAutomaticCreatorRole } from '@/lib/creator-role-sync';

const VALID_TIERS = new Set<AvatarFrameTier>([
  'MEMBER',
  'NHAN_KIET',
  'THIEN_KIEU',
  'THAN_THOAI',
]);

const VALID_ROLES = new Set<Role>(['MEMBER', 'MODDER', 'ADMIN']);

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const admin = await getCurrentUser();

  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const { userId } = await context.params;
  const formData = await request.formData();
  const tier = String(formData.get('avatarFrameTier') ?? '') as AvatarFrameTier;
  let role = String(formData.get('role') ?? '') as Role;

  if (!VALID_TIERS.has(tier) || !VALID_ROLES.has(role)) {
    return new Response('Dữ liệu phân quyền không hợp lệ', { status: 400 });
  }

  if (userId === admin.id && role !== 'ADMIN') {
    return new Response('Không thể tự hạ quyền tài khoản quản trị đang đăng nhập.', {
      status: 400,
    });
  }

  const users = await getUsers();
  const index = users.findIndex((user) => user.id === userId);

  if (index < 0) {
    return new Response('Không tìm thấy người dùng', { status: 404 });
  }

  // Thành viên đã đạt Trúc Cơ Sơ kỳ luôn được giữ tối thiểu ở role MODDER.
  if (role === 'MEMBER' && await isEligibleForAutomaticCreatorRole(userId)) {
    role = 'MODDER';
  }

  users[index] = {
    ...users[index],
    role,
    avatarFrameTier: tier,
    updatedAt: new Date().toISOString(),
  };

  await saveUsers(users);

  revalidatePath('/admin/author-center');
  revalidatePath('/creator');
  revalidatePath('/creator/mods');
  revalidatePath('/profile');

  if (users[index].profileSlug) {
    revalidatePath(`/authors/${users[index].profileSlug}`);
  }

  return NextResponse.redirect(
    createSafeRedirectUrl('/admin/author-center?saved=1', request),
    303,
  );
}
