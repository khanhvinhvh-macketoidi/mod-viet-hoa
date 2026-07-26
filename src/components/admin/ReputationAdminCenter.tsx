'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  History,
  Lock,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import styles from './ReputationAdminCenter.module.css';

type UserRole = 'MEMBER' | 'MODDER' | 'ADMIN';
type ReputationStatus = 'ACTIVE' | 'FROZEN';
type TabId = 'OVERVIEW' | 'LOGS' | 'TIERS';

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  profileSlug?: string;
  totalPoints: number;
  storedTotalPoints: number;
  ledgerTotalPoints: number;
  delta: number;
  tierId: string;
  tierName: string;
  tierColor: string;
  tierClassName: string;
  status: ReputationStatus;
  logCount: number;
};

type LogRow = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  type: string;
  typeLabel: string;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  createdAt: string;
  reversedAt?: string;
  reason?: string;
};

type TierRow = {
  id: string;
  name: string;
  minPoints: number;
  color: string;
  className: string;
};

type Props = {
  currentAdminId: string;
  users: UserRow[];
  logs: LogRow[];
  logTypeOptions: Array<{ id: string; label: string }>;
  tiers: TierRow[];
  summary: {
    totalUsers: number;
    totalPoints: number;
    totalLedgerEntries: number;
    frozenUsers: number;
    mismatchCount: number;
  };
};

type Notice = {
  tone: 'SUCCESS' | 'ERROR' | 'INFO';
  message: string;
};

const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value));
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : dateFormatter.format(date);
}

export default function ReputationAdminCenter({
  currentAdminId,
  users,
  logs,
  logTypeOptions,
  tiers,
  summary,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('OVERVIEW');
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [integrityFilter, setIntegrityFilter] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [logQuery, setLogQuery] = useState('');
  const [logType, setLogType] = useState('ALL');
  const [logDirection, setLogDirection] = useState('ALL');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0];

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi-VN');
    return users.filter((user) => {
      const matchesSearch =
        !normalized ||
        user.username.toLocaleLowerCase('vi-VN').includes(normalized) ||
        user.displayName.toLocaleLowerCase('vi-VN').includes(normalized) ||
        user.id.toLocaleLowerCase('vi-VN').includes(normalized);

      return (
        matchesSearch &&
        (tierFilter === 'ALL' || user.tierId === tierFilter) &&
        (statusFilter === 'ALL' || user.status === statusFilter) &&
        (integrityFilter === 'ALL' ||
          (integrityFilter === 'MISMATCH' ? user.delta !== 0 : user.delta === 0))
      );
    });
  }, [integrityFilter, query, statusFilter, tierFilter, users]);

  const filteredLogs = useMemo(() => {
    const normalized = logQuery.trim().toLocaleLowerCase('vi-VN');
    return logs.filter((log) => {
      const matchesSearch =
        !normalized ||
        log.displayName.toLocaleLowerCase('vi-VN').includes(normalized) ||
        log.username.toLocaleLowerCase('vi-VN').includes(normalized) ||
        log.typeLabel.toLocaleLowerCase('vi-VN').includes(normalized) ||
        log.reason?.toLocaleLowerCase('vi-VN').includes(normalized);

      return (
        matchesSearch &&
        (logType === 'ALL' || log.type === logType) &&
        (logDirection === 'ALL' ||
          (logDirection === 'POSITIVE' ? log.points > 0 : log.points < 0))
      );
    });
  }, [logDirection, logQuery, logType, logs]);

  function runAction(
    action: () => Promise<{ ok?: boolean; message?: string }>,
    successMessage: string,
  ) {
    setNotice(null);
    startTransition(() => {
      void (async () => {
        try {
          const payload = await action();
          if (!payload.ok) {
            throw new Error(payload.message || 'Thao tác thất bại.');
          }
          setNotice({ tone: 'SUCCESS', message: successMessage });
          router.refresh();
        } catch (error) {
          setNotice({
            tone: 'ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Thao tác thất bại.',
          });
        }
      })();
    });
  }

  async function postJson(url: string, body: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}><Award size={16} /> Admin Reputation Center</p>
          <h1>Quản trị Danh vọng</h1>
          <p>
            Theo dõi ledger, danh hiệu, trạng thái nhận điểm và điều chỉnh Danh vọng
            của toàn bộ đạo hữu.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/admin/cultivation" className={styles.secondaryButton}>
            <Sparkles size={16} /> Quản trị Tu Vi
          </Link>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={isPending}
            onClick={() =>
              runAction(
                () => fetch('/api/admin/reputation/rebuild').then((r) => r.json()),
                'Audit Danh vọng đã hoàn tất.',
              )
            }
          >
            <RefreshCcw size={16} /> Audit hệ thống
          </button>
        </div>
      </section>

      {notice && (
        <div className={`${styles.notice} ${styles[`notice${notice.tone}`]}`}>
          {notice.tone === 'ERROR' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
          {notice.message}
        </div>
      )}

      <section className={styles.summaryGrid}>
        <Summary icon={<UsersRound />} label="Đạo hữu" value={summary.totalUsers} />
        <Summary icon={<Award />} label="Tổng Danh vọng" value={summary.totalPoints} />
        <Summary icon={<History />} label="Bút toán ledger" value={summary.totalLedgerEntries} />
        <Summary icon={<Lock />} label="Đang đóng băng" value={summary.frozenUsers} />
        <Summary
          icon={<AlertTriangle />}
          label="Dữ liệu lệch"
          value={summary.mismatchCount}
          warning={summary.mismatchCount > 0}
        />
      </section>

      <nav className={styles.tabs} aria-label="Khu vực quản trị Danh vọng">
        <button className={tab === 'OVERVIEW' ? styles.tabActive : ''} onClick={() => setTab('OVERVIEW')}>
          <UserRound size={16} /> Người dùng
        </button>
        <button className={tab === 'LOGS' ? styles.tabActive : ''} onClick={() => setTab('LOGS')}>
          <History size={16} /> Nhật ký
        </button>
        <button className={tab === 'TIERS' ? styles.tabActive : ''} onClick={() => setTab('TIERS')}>
          <Settings2 size={16} /> Cấp Danh vọng
        </button>
      </nav>

      {tab === 'OVERVIEW' && (
        <section className={styles.workspace}>
          <div className={styles.userPanel}>
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, username hoặc user ID..." />
              </label>
              <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
                <option value="ALL">Tất cả danh hiệu</option>
                {tiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">Mọi trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="FROZEN">Đang đóng băng</option>
              </select>
              <select value={integrityFilter} onChange={(e) => setIntegrityFilter(e.target.value)}>
                <option value="ALL">Mọi integrity</option>
                <option value="MATCHED">Đã khớp</option>
                <option value="MISMATCH">Bị lệch</option>
              </select>
            </div>

            <div className={styles.userList}>
              {filteredUsers.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`${styles.userRow} ${selectedUser?.id === user.id ? styles.userRowActive : ''}`}
                >
                  <span className={styles.userAvatar}><UserRound size={18} /></span>
                  <span className={styles.userCopy}>
                    <strong>{user.displayName}</strong>
                    <small>@{user.username}</small>
                    <em style={{ color: user.tierColor }}>{user.tierName}</em>
                  </span>
                  <span className={styles.userPoints}>{formatNumber(user.totalPoints)}</span>
                  {user.delta !== 0 && <AlertTriangle size={16} className={styles.warningIcon} />}
                </button>
              ))}
            </div>
          </div>

          {selectedUser && (
            <aside className={styles.detailPanel}>
              <div className={styles.detailHeading}>
                <span className={styles.detailAvatar}><ShieldCheck size={20} /></span>
                <div>
                  <h2>{selectedUser.displayName}</h2>
                  <p>@{selectedUser.username}</p>
                </div>
              </div>

              <div className={styles.titleCard} style={{ '--tier-color': selectedUser.tierColor } as CSSProperties}>
                <small>Danh hiệu hiện tại</small>
                <strong>{selectedUser.tierName}</strong>
                <span>{formatNumber(selectedUser.totalPoints)} Danh vọng</span>
              </div>

              <div className={styles.integrityGrid}>
                <div><small>Stored</small><strong>{formatNumber(selectedUser.storedTotalPoints)}</strong></div>
                <div><small>Ledger</small><strong>{formatNumber(selectedUser.ledgerTotalPoints)}</strong></div>
                <div className={selectedUser.delta !== 0 ? styles.integrityWarning : ''}><small>Delta</small><strong>{formatNumber(selectedUser.delta)}</strong></div>
              </div>

              <form
                className={styles.adjustForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  runAction(
                    () => postJson('/api/admin/reputation/adjust', {
                      userId: selectedUser.id,
                      points: Number(form.get('points')),
                      reason: String(form.get('reason') ?? ''),
                    }),
                    'Đã điều chỉnh Danh vọng.',
                  );
                }}
              >
                <label>
                  <span>Số điểm cộng/trừ</span>
                  <input name="points" type="number" required placeholder="Ví dụ: 200 hoặc -50" />
                </label>
                <label>
                  <span>Lý do</span>
                  <textarea name="reason" required minLength={3} placeholder="Lý do điều chỉnh..." />
                </label>
                <button type="submit" className={styles.primaryButton} disabled={isPending}>
                  Lưu điều chỉnh
                </button>
              </form>

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={isPending || selectedUser.id === currentAdminId}
                  onClick={() =>
                    runAction(
                      () => postJson('/api/admin/reputation/status', {
                        userId: selectedUser.id,
                        status: selectedUser.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE',
                      }),
                      selectedUser.status === 'ACTIVE'
                        ? 'Đã đóng băng nhận Danh vọng.'
                        : 'Đã mở lại nhận Danh vọng.',
                    )
                  }
                >
                  {selectedUser.status === 'ACTIVE' ? <Lock size={16} /> : <Unlock size={16} />}
                  {selectedUser.status === 'ACTIVE' ? 'Đóng băng' : 'Mở khóa'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => postJson('/api/admin/reputation/rebuild', { userId: selectedUser.id }),
                      'Đã rebuild Danh vọng của đạo hữu.',
                    )
                  }
                >
                  <RefreshCcw size={16} /> Rebuild user
                </button>
              </div>
            </aside>
          )}
        </section>
      )}

      {tab === 'LOGS' && (
        <section className={styles.logPanel}>
          <div className={styles.logToolbar}>
            <label className={styles.searchField}><Search size={16} /><input value={logQuery} onChange={(e) => setLogQuery(e.target.value)} placeholder="Tìm nhật ký..." /></label>
            <select value={logType} onChange={(e) => setLogType(e.target.value)}>
              <option value="ALL">Tất cả hoạt động</option>
              {logTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <select value={logDirection} onChange={(e) => setLogDirection(e.target.value)}>
              <option value="ALL">Cộng và trừ</option>
              <option value="POSITIVE">Chỉ cộng</option>
              <option value="NEGATIVE">Chỉ trừ</option>
            </select>
          </div>

          <div className={styles.logList}>
            {filteredLogs.map((log) => (
              <article key={log.id} className={styles.logRow}>
                <span className={log.points >= 0 ? styles.positive : styles.negative}>
                  {log.points >= 0 ? '+' : ''}{formatNumber(log.points)}
                </span>
                <div>
                  <strong>{log.typeLabel}</strong>
                  <small>{log.displayName} · @{log.username}</small>
                  {log.reason && <p>{log.reason}</p>}
                </div>
                <time>{formatDate(log.createdAt)}</time>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'TIERS' && (
        <section className={styles.tierPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span>Danh hiệu hệ thống</span>
              <h2>16 cấp Danh vọng</h2>
            </div>
          </div>

          <form
            className={styles.tierList}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const payload = tiers.map((tier) => ({
                id: tier.id,
                name: String(form.get(`name:${tier.id}`) ?? tier.name),
                minPoints: Number(form.get(`min:${tier.id}`) ?? tier.minPoints),
                color: String(form.get(`color:${tier.id}`) ?? tier.color),
              }));
              runAction(
                () => postJson('/api/admin/reputation/settings', { tiers: payload }),
                'Đã lưu mốc Danh vọng.',
              );
            }}
          >
            {tiers.map((tier, index) => (
              <div key={tier.id} className={styles.tierRow} style={{ '--tier-color': tier.color } as CSSProperties}>
                <span className={styles.tierIndex}>{index + 1}</span>
                <input name={`name:${tier.id}`} defaultValue={tier.name} aria-label={`Tên ${tier.name}`} />
                <input name={`min:${tier.id}`} type="number" min={0} defaultValue={tier.minPoints} aria-label={`Mốc ${tier.name}`} />
                <input name={`color:${tier.id}`} type="color" defaultValue={tier.color} aria-label={`Màu ${tier.name}`} />
              </div>
            ))}
            <div className={styles.tierActions}>
              <button type="submit" className={styles.primaryButton} disabled={isPending}>Lưu cấu hình</button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={isPending}
                onClick={() => {
                  if (!window.confirm('Rebuild toàn bộ Danh vọng từ ledger?')) return;
                  runAction(
                    () => postJson('/api/admin/reputation/rebuild', {
                      allUsers: true,
                      confirm: 'REBUILD_REPUTATION_FROM_LOGS',
                    }),
                    'Đã rebuild toàn bộ Danh vọng.',
                  );
                }}
              >
                <RefreshCcw size={16} /> Rebuild toàn bộ
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

function Summary({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <article className={`${styles.summaryCard} ${warning ? styles.summaryWarning : ''}`}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{formatNumber(value)}</strong></div>
    </article>
  );
}
