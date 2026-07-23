import type { Role } from './types';

/**
 * Nhãn hiển thị theo phong cách tiên hiệp.
 * Giá trị Role nội bộ (MEMBER/MODDER/ADMIN) được giữ nguyên để bảo toàn dữ liệu và API.
 */
export const ROLE_DISPLAY_LABELS: Readonly<Record<Role, string>> = {
  MEMBER: 'Tán Tu',
  MODDER: 'Tông Sư',
  ADMIN: 'Giới Đế',
};

export function getRoleDisplayLabel(role: Role): string {
  return ROLE_DISPLAY_LABELS[role];
}
