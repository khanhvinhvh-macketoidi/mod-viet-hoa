import 'server-only';

import { getAuthorStats } from './author-stats';
import { getCultivationRealm } from './author-center/author-center';
import type { User } from './types';
import { getUsers, saveUsers } from './users';

export const AUTO_CREATOR_STAGE_INDEX = 3;
export const AUTO_CREATOR_REALM_LABEL = 'Trúc Cơ · Sơ kỳ';

export async function isEligibleForAutomaticCreatorRole(
  userId: string,
): Promise<boolean> {
  const stats = await getAuthorStats(userId);
  return getCultivationRealm(stats).stageIndex >= AUTO_CREATOR_STAGE_INDEX;
}

/**
 * Tự động thăng MEMBER thành MODDER khi đạt Trúc Cơ Sơ kỳ.
 * Không tự hạ quyền và không can thiệp ADMIN/MODDER hiện có.
 */
export async function syncAutomaticCreatorRole(user: User): Promise<User> {
  if (user.role !== 'MEMBER' || user.isActive === false) {
    return user;
  }

  if (!(await isEligibleForAutomaticCreatorRole(user.id))) {
    return user;
  }

  const users = await getUsers();
  const index = users.findIndex((item) => item.id === user.id);

  if (index < 0 || users[index].role !== 'MEMBER') {
    return index >= 0 ? users[index] : user;
  }

  const promotedUser: User = {
    ...users[index],
    role: 'MODDER',
    updatedAt: new Date().toISOString(),
  };

  users[index] = promotedUser;
  await saveUsers(users);

  return promotedUser;
}
