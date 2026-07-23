'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
} from 'lucide-react';
import type { AvatarFrameTier, Role } from '@/lib/types';
import { ROLE_DISPLAY_LABELS } from '@/lib/role-labels';

type Option = { id: string; name: string };

type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  frameTier: AvatarFrameTier;
  realmId: string;
  realmLabel: string;
  isAutoCreatorEligible: boolean;
};

type Props = {
  users: ManagedUser[];
  frameOptions: Option[];
  saved: boolean;
};

export default function AuthorCenterManager({ users, frameOptions, saved }: Props) {
  const [query, setQuery] = useState('');
  const [realm, setRealm] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [frame, setFrame] = useState('ALL');

  const realmOptions = useMemo(() => {
    const unique = new Map<string, string>();
    users.forEach((user) => unique.set(user.realmId, user.realmLabel.split(' · ')[0]));
    return Array.from(unique.entries());
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');

    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.username.toLocaleLowerCase('vi-VN').includes(normalizedQuery) ||
        user.displayName.toLocaleLowerCase('vi-VN').includes(normalizedQuery);

      return (
        matchesQuery &&
        (realm === 'ALL' || user.realmId === realm) &&
        (role === 'ALL' || user.role === role) &&
        (frame === 'ALL' || user.frameTier === frame)
      );
    });
  }, [frame, query, realm, role, users]);

  const resetFilters = () => {
    setQuery('');
    setRealm('ALL');
    setRole('ALL');
    setFrame('ALL');
  };

  return (
    <>
      {saved && (
        <div className="admin-author-notice" role="status">
          <CheckCircle2 size={17} />
          Thay đổi đã được lưu.
        </div>
      )}

      <section className="admin-author-tools" aria-label="Tìm kiếm và lọc thành viên">
        <label className="admin-author-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo username hoặc tên hiển thị..."
          />
        </label>

        <div className="admin-author-filters">
          <span className="admin-author-filter-label"><Filter size={15} /> Bộ lọc</span>

          <select value={realm} onChange={(event) => setRealm(event.target.value)} aria-label="Lọc theo cảnh giới">
            <option value="ALL">Tất cả cảnh giới</option>
            {realmOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>

          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Lọc theo thân phận quyền hạn">
            <option value="ALL">Tất cả quyền hạn</option>
            <option value="MEMBER">Tán Tu</option>
            <option value="MODDER">Tông Sư</option>
            <option value="ADMIN">Giới Đế</option>
          </select>

          <select value={frame} onChange={(event) => setFrame(event.target.value)} aria-label="Lọc theo khung thân phận">
            <option value="ALL">Tất cả thân phận</option>
            {frameOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>

          <button type="button" onClick={resetFilters} className="admin-author-reset">Đặt lại</button>
        </div>

        <p className="admin-author-result-count">
          Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} đạo hữu
        </p>
      </section>

      <div className="admin-author-table">
        {filteredUsers.map((user) => (
          <form
            key={user.id}
            className="admin-author-row"
            action={`/api/admin/author-center/${user.id}`}
            method="post"
          >
            <div className="admin-author-identity">
              <span className={`admin-author-role-icon is-${user.role.toLowerCase()}`}>
                {user.role === 'ADMIN' ? <ShieldCheck size={18} /> : user.role === 'MODDER' ? <Sparkles size={18} /> : <UserCog size={18} />}
              </span>
              <div>
                <strong>{user.displayName}</strong>
                <small>@{user.username}</small>
                <div className="admin-author-badges">
                  <span className={`admin-author-badge role-${user.role.toLowerCase()}`}>{ROLE_DISPLAY_LABELS[user.role]}</span>
                  <span className="admin-author-badge realm">{user.realmLabel}</span>
                  {user.isAutoCreatorEligible && user.role === 'MODDER' && (
                    <span className="admin-author-badge automatic">Tự động thăng cấp</span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-author-controls">
              <label className="admin-author-field">
                <span>Quyền hạn</span>
                <select name="role" defaultValue={user.role} aria-label={`Quyền của ${user.username}`}>
                  <option value="MEMBER" disabled={user.isAutoCreatorEligible}>Tán Tu</option>
                  <option value="MODDER">Tông Sư</option>
                  <option value="ADMIN">Giới Đế</option>
                </select>
              </label>

              <label className="admin-author-field">
                <span>Thân phận</span>
                <select name="avatarFrameTier" defaultValue={user.frameTier} aria-label={`Khung của ${user.username}`}>
                  {frameOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>

              <button type="submit" className="admin-author-save">Lưu thay đổi</button>
            </div>
          </form>
        ))}

        {filteredUsers.length === 0 && (
          <div className="admin-author-empty">
            Không tìm thấy đạo hữu phù hợp với điều kiện đang chọn.
          </div>
        )}
      </div>
    </>
  );
}
