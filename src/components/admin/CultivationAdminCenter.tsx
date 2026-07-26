'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Filter,
  History,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wrench,
} from 'lucide-react';
import {
  useMemo,
  useState,
  useTransition,
} from 'react';
import styles from './CultivationAdminCenter.module.css';

type UserRole = 'MEMBER' | 'MODDER' | 'ADMIN';
type PhaseId = 'SO_KY' | 'TRUNG_KY' | 'HAU_KY';
type TabId = 'OVERVIEW' | 'LOGS' | 'SETTINGS';

type CultivationUserRow = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  profileSlug?: string;
  createdAt: string;
  totalXp: number;
  storedTotalXp: number;
  ledgerTotalXp: number;
  delta: number;
  realmId: string;
  realmName: string;
  phase: PhaseId;
  phaseName: string;
  realmXp: number;
  requiredXp: number;
  overallProgress: number;
  phaseProgress: number;
  streak: number;
  lastRewardDate?: string;
  logCount: number;
  lastActivityAt?: string;
  isLegacyPreview: boolean;
};

type CultivationLogRow = {
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
  metadata: Record<string, string | number | boolean | null>;
};

type Props = {
  currentAdminId: string;
  users: CultivationUserRow[];
  logs: CultivationLogRow[];
  logTypeOptions: Array<{ id: string; label: string }>;
  summary: {
    totalUsers: number;
    totalXp: number;
    totalLedgerEntries: number;
    activeGrants: number;
    reversalEntries: number;
    adminAdjustments: number;
    mismatchCount: number;
    visibleLogCount: number;
  };
  settings: {
    earlyPhasePercent: number;
    middlePhasePercent: number;
    updatedAt: string;
    realms: Array<{
      id: string;
      name: string;
      requiredXp: number;
      phaseCount: number;
    }>;
  };
  settingsSaved: boolean;
};

type Notice = {
  tone: 'SUCCESS' | 'ERROR' | 'INFO';
  message: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Tán Tu',
  MODDER: 'Tông Sư',
  ADMIN: 'Giới Đế',
};

const numberFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

function formatDate(value?: string): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : dateFormatter.format(date);
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function getPhaseClass(phase: PhaseId): string {
  if (phase === 'HAU_KY') return styles.phaseLate;
  if (phase === 'TRUNG_KY') return styles.phaseMiddle;
  return styles.phaseEarly;
}

export default function CultivationAdminCenter({
  currentAdminId,
  users,
  logs,
  logTypeOptions,
  summary,
  settings,
  settingsSaved,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>('OVERVIEW');
  const [query, setQuery] = useState('');
  const [realmFilter, setRealmFilter] = useState('ALL');
  const [integrityFilter, setIntegrityFilter] = useState('ALL');
  const [selectedUserId, setSelectedUserId] = useState(
    users.find((user) => user.delta !== 0)?.id ?? users[0]?.id ?? '',
  );
  const [logQuery, setLogQuery] = useState('');
  const [logType, setLogType] = useState('ALL');
  const [logSign, setLogSign] = useState('ALL');
  const [logUserId, setLogUserId] = useState('ALL');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [rebuildConfirmation, setRebuildConfirmation] = useState('');
  const [notice, setNotice] = useState<Notice | null>(
    settingsSaved
      ? {
          tone: 'SUCCESS',
          message: 'Cấu hình cảnh giới đã được lưu.',
        }
      : null,
  );

  const realmOptions = useMemo(() => {
    const unique = new Map<string, string>();
    users.forEach((user) => unique.set(user.realmId, user.realmName));
    return [...unique.entries()];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalized = normalizeSearch(query);

    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        normalizeSearch(user.username).includes(normalized) ||
        normalizeSearch(user.displayName).includes(normalized) ||
        user.id.toLocaleLowerCase().includes(normalized);

      const matchesRealm =
        realmFilter === 'ALL' || user.realmId === realmFilter;
      const matchesIntegrity =
        integrityFilter === 'ALL' ||
        (integrityFilter === 'MISMATCH' && user.delta !== 0) ||
        (integrityFilter === 'HEALTHY' && user.delta === 0) ||
        (integrityFilter === 'LEGACY' && user.isLegacyPreview);

      return matchesQuery && matchesRealm && matchesIntegrity;
    });
  }, [integrityFilter, query, realmFilter, users]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0],
    [selectedUserId, users],
  );

  const filteredLogs = useMemo(() => {
    const normalized = normalizeSearch(logQuery);

    return logs.filter((log) => {
      const matchesQuery =
        !normalized ||
        normalizeSearch(log.displayName).includes(normalized) ||
        normalizeSearch(log.username).includes(normalized) ||
        normalizeSearch(log.typeLabel).includes(normalized) ||
        normalizeSearch(log.reason ?? '').includes(normalized) ||
        normalizeSearch(log.targetId ?? '').includes(normalized) ||
        normalizeSearch(log.uniqueKey ?? '').includes(normalized);

      const matchesType = logType === 'ALL' || log.type === logType;
      const matchesSign =
        logSign === 'ALL' ||
        (logSign === 'POSITIVE' && log.points > 0) ||
        (logSign === 'NEGATIVE' && log.points < 0);
      const matchesUser = logUserId === 'ALL' || log.userId === logUserId;

      return matchesQuery && matchesType && matchesSign && matchesUser;
    });
  }, [logQuery, logSign, logType, logUserId, logs]);

  function runRequest(
    operation: () => Promise<string>,
  ) {
    setNotice(null);

    startTransition(async () => {
      try {
        const message = await operation();
        setNotice({ tone: 'SUCCESS', message });
        router.refresh();
      } catch (error) {
        setNotice({
          tone: 'ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Thao tác không thành công.',
        });
      }
    });
  }

  function handleAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;

    const points = Number(adjustPoints);
    const reason = adjustReason.trim();

    if (!Number.isInteger(points) || points === 0) {
      setNotice({
        tone: 'ERROR',
        message: 'Số XP điều chỉnh phải là số nguyên khác 0.',
      });
      return;
    }

    if (reason.length < 5) {
      setNotice({
        tone: 'ERROR',
        message: 'Hãy nhập lý do điều chỉnh tối thiểu 5 ký tự.',
      });
      return;
    }

    runRequest(async () => {
      const response = await fetch('/api/admin/cultivation/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          points,
          reason,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        appliedPoints?: number;
        totalXp?: number;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Không thể điều chỉnh XP.');
      }

      setAdjustPoints('');
      setAdjustReason('');

      return `Đã ${Number(payload.appliedPoints) > 0 ? 'cộng' : 'trừ'} ${formatNumber(Math.abs(Number(payload.appliedPoints)))} XP. Tổng mới: ${formatNumber(Number(payload.totalXp))} XP.`;
    });
  }

  function handleAudit() {
    runRequest(async () => {
      const response = await fetch('/api/admin/cultivation/rebuild', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        mismatches?: unknown[];
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Không thể audit dữ liệu tu vi.');
      }

      const mismatchCount = payload.mismatches?.length ?? 0;
      return mismatchCount === 0
        ? 'Audit hoàn tất: toàn bộ XP đang khớp với nhật ký.'
        : `Audit phát hiện ${mismatchCount} tài khoản đang lệch XP.`;
    });
  }

  function handleRebuildUser(userId: string) {
    runRequest(async () => {
      const response = await fetch('/api/admin/cultivation/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        result?: { totalXp?: number };
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Không thể rebuild tài khoản.');
      }

      return `Đã rebuild tài khoản từ ledger: ${formatNumber(Number(payload.result?.totalXp ?? 0))} XP.`;
    });
  }

  function handleRebuildAll() {
    if (rebuildConfirmation !== 'REBUILD_FROM_LOGS') {
      setNotice({
        tone: 'ERROR',
        message: 'Mã xác nhận chưa đúng.',
      });
      return;
    }

    runRequest(async () => {
      const response = await fetch('/api/admin/cultivation/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allUsers: true,
          confirm: 'REBUILD_FROM_LOGS',
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        updatedUsers?: number;
        skippedUsers?: number;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'Không thể rebuild toàn bộ.');
      }

      setRebuildConfirmation('');
      return `Đã rebuild ${payload.updatedUsers ?? 0} tài khoản; bỏ qua ${payload.skippedUsers ?? 0} tài khoản chưa có log.`;
    });
  }

  function openUserLogs(userId: string) {
    setLogUserId(userId);
    setTab('LOGS');
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div>
          <p className={styles.kicker}>
            <ShieldCheck size={15} /> Admin Cultivation Center
          </p>
          <h1>Quản trị hệ thống Tu Vi</h1>
          <p>
            Theo dõi XP, cảnh giới, lịch sử cộng trừ, đối soát ledger và
            điều chỉnh dữ liệu mà không cần sửa JSON thủ công.
          </p>
        </div>

        <div className={styles.heroActions}>
          <Link href="/admin/author-center" className={styles.secondaryButton}>
            <UsersRound size={16} /> Quản lý thân phận
          </Link>
          <button
            type="button"
            onClick={handleAudit}
            disabled={isPending}
            className={styles.primaryButton}
          >
            <CircleGauge size={16} /> Audit toàn hệ thống
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`${styles.notice} ${
            notice.tone === 'ERROR'
              ? styles.noticeError
              : notice.tone === 'SUCCESS'
                ? styles.noticeSuccess
                : styles.noticeInfo
          }`}
          role="status"
        >
          {notice.tone === 'ERROR' ? (
            <AlertTriangle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <section className={styles.summaryGrid} aria-label="Tổng quan Tu Vi">
        <SummaryCard
          icon={<UsersRound size={20} />}
          label="Tài khoản"
          value={formatNumber(summary.totalUsers)}
          detail={`${formatNumber(summary.mismatchCount)} tài khoản lệch`}
          warning={summary.mismatchCount > 0}
        />
        <SummaryCard
          icon={<Sparkles size={20} />}
          label="Tổng Tu Vi"
          value={formatNumber(summary.totalXp)}
          detail="Theo cultivation ledger"
        />
        <SummaryCard
          icon={<History size={20} />}
          label="Bút toán ledger"
          value={formatNumber(summary.totalLedgerEntries)}
          detail={`${formatNumber(summary.visibleLogCount)} log gần nhất đang hiển thị`}
        />
        <SummaryCard
          icon={<ArrowUp size={20} />}
          label="Grant đang active"
          value={formatNumber(summary.activeGrants)}
          detail={`${formatNumber(summary.reversalEntries)} bút toán hoàn XP`}
        />
        <SummaryCard
          icon={<Wrench size={20} />}
          label="Admin adjustment"
          value={formatNumber(summary.adminAdjustments)}
          detail="Tất cả đều cần lý do"
        />
      </section>

      <nav className={styles.tabs} aria-label="Khu vực quản trị Tu Vi">
        <TabButton
          active={tab === 'OVERVIEW'}
          onClick={() => setTab('OVERVIEW')}
          icon={<Activity size={16} />}
        >
          Tổng quan người dùng
        </TabButton>
        <TabButton
          active={tab === 'LOGS'}
          onClick={() => setTab('LOGS')}
          icon={<History size={16} />}
        >
          Nhật ký XP
        </TabButton>
        <TabButton
          active={tab === 'SETTINGS'}
          onClick={() => setTab('SETTINGS')}
          icon={<Settings2 size={16} />}
        >
          Cấu hình & phục hồi
        </TabButton>
      </nav>

      {tab === 'OVERVIEW' && (
        <section className={styles.workspace}>
          <div className={styles.userPanel}>
            <div className={styles.panelHeading}>
              <div>
                <span>Đạo hữu</span>
                <h2>Danh sách cultivation</h2>
              </div>
              <strong>{filteredUsers.length}/{users.length}</strong>
            </div>

            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tên, username hoặc user ID..."
                />
              </label>

              <label className={styles.selectField}>
                <Filter size={15} />
                <select
                  value={realmFilter}
                  onChange={(event) => setRealmFilter(event.target.value)}
                  aria-label="Lọc cảnh giới"
                >
                  <option value="ALL">Mọi cảnh giới</option>
                  {realmOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>

              <select
                className={styles.plainSelect}
                value={integrityFilter}
                onChange={(event) => setIntegrityFilter(event.target.value)}
                aria-label="Lọc tính toàn vẹn dữ liệu"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="HEALTHY">Đang khớp ledger</option>
                <option value="MISMATCH">Đang lệch XP</option>
                <option value="LEGACY">Đang dùng legacy preview</option>
              </select>
            </div>

            <div className={styles.userList}>
              {filteredUsers.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className={`${styles.userRow} ${
                    selectedUser?.id === user.id ? styles.userRowActive : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <span className={styles.userAvatar}>
                    {user.displayName.slice(0, 1).toLocaleUpperCase('vi-VN')}
                  </span>

                  <span className={styles.userIdentity}>
                    <strong>
                      {user.displayName}
                      {user.id === currentAdminId && <i>Bạn</i>}
                    </strong>
                    <small>@{user.username}</small>
                    <span className={styles.userBadges}>
                      <em>{ROLE_LABELS[user.role]}</em>
                      <em className={getPhaseClass(user.phase)}>
                        {user.realmName} · {user.phaseName}
                      </em>
                    </span>
                  </span>

                  <span className={styles.userXp}>
                    <strong>{formatNumber(user.totalXp)} XP</strong>
                    <small>{user.logCount} log</small>
                    {user.delta !== 0 && (
                      <em className={styles.mismatchBadge}>
                        Lệch {user.delta > 0 ? '+' : ''}{formatNumber(user.delta)}
                      </em>
                    )}
                  </span>

                  <ChevronRight size={17} className={styles.chevron} />
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className={styles.emptyState}>
                  Không tìm thấy tài khoản phù hợp.
                </div>
              )}
            </div>
          </div>

          <aside className={styles.detailPanel}>
            {selectedUser ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailIdentity}>
                    <span>{selectedUser.displayName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h2>{selectedUser.displayName}</h2>
                      <p>@{selectedUser.username}</p>
                    </div>
                  </div>
                  <span className={styles.roleChip}>
                    {ROLE_LABELS[selectedUser.role]}
                  </span>
                </div>

                <div className={styles.realmCard}>
                  <div className={styles.realmTitle}>
                    <div>
                      <span>Cảnh giới hiện tại</span>
                      <strong>
                        {selectedUser.realmName} · {selectedUser.phaseName}
                      </strong>
                    </div>
                    <em>{selectedUser.overallProgress}%</em>
                  </div>

                  <div className={styles.progressTrack}>
                    <span style={{ width: `${selectedUser.overallProgress}%` }} />
                  </div>

                  <div className={styles.realmNumbers}>
                    <span>
                      {formatNumber(selectedUser.realmXp)} /{' '}
                      {formatNumber(selectedUser.requiredXp)} trong cảnh giới
                    </span>
                    <strong>{formatNumber(selectedUser.totalXp)} tổng XP</strong>
                  </div>
                </div>

                <div className={styles.detailStats}>
                  <DetailStat label="Stored XP" value={formatNumber(selectedUser.storedTotalXp)} />
                  <DetailStat label="Ledger XP" value={formatNumber(selectedUser.ledgerTotalXp)} />
                  <DetailStat label="Chuỗi login" value={`${selectedUser.streak} ngày`} />
                  <DetailStat label="Log gần nhất" value={formatDate(selectedUser.lastActivityAt)} />
                </div>

                {selectedUser.delta !== 0 ? (
                  <div className={styles.integrityWarning}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Dữ liệu đang lệch ledger</strong>
                      <span>
                        Delta: {selectedUser.delta > 0 ? '+' : ''}
                        {formatNumber(selectedUser.delta)} XP
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRebuildUser(selectedUser.id)}
                      disabled={isPending}
                    >
                      Rebuild
                    </button>
                  </div>
                ) : (
                  <div className={styles.integrityHealthy}>
                    <CheckCircle2 size={17} /> XP đang khớp hoàn toàn với ledger.
                  </div>
                )}

                {selectedUser.isLegacyPreview && (
                  <div className={styles.legacyWarning}>
                    Tài khoản chưa có cultivation ledger riêng và đang hiển thị
                    legacy preview.
                  </div>
                )}

                <div className={styles.detailActions}>
                  <button
                    type="button"
                    onClick={() => openUserLogs(selectedUser.id)}
                    className={styles.secondaryButton}
                  >
                    <History size={16} /> Xem {selectedUser.logCount} log
                  </button>
                  {selectedUser.profileSlug && (
                    <Link
                      href={`/authors/${selectedUser.profileSlug}`}
                      className={styles.secondaryButton}
                      target="_blank"
                    >
                      <UserRound size={16} /> Hồ sơ công khai
                    </Link>
                  )}
                </div>

                {!selectedUser.isLegacyPreview ? (
                  <form className={styles.adjustForm} onSubmit={handleAdjustment}>
                  <div className={styles.formTitle}>
                    <Wrench size={17} />
                    <div>
                      <strong>Điều chỉnh XP thủ công</strong>
                      <span>Dùng số âm để trừ XP. Mọi thay đổi đều được ghi log.</span>
                    </div>
                  </div>

                  <label>
                    <span>Số XP</span>
                    <input
                      type="number"
                      min="-1000000"
                      max="1000000"
                      step="1"
                      value={adjustPoints}
                      onChange={(event) => setAdjustPoints(event.target.value)}
                      placeholder="Ví dụ: 200 hoặc -50"
                      required
                    />
                  </label>

                  <label>
                    <span>Lý do</span>
                    <textarea
                      value={adjustReason}
                      onChange={(event) => setAdjustReason(event.target.value)}
                      placeholder="Giải thích rõ lý do điều chỉnh..."
                      minLength={5}
                      maxLength={240}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={isPending}
                  >
                    {Number(adjustPoints) < 0 ? (
                      <ArrowDown size={16} />
                    ) : (
                      <ArrowUp size={16} />
                    )}
                    Áp dụng điều chỉnh
                  </button>
                </form>
                ) : (
                  <div className={styles.adjustUnavailable}>
                    Chưa thể điều chỉnh thủ công vì tài khoản chưa được migrate
                    sang cultivation ledger mới.
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>Chưa có tài khoản.</div>
            )}
          </aside>
        </section>
      )}

      {tab === 'LOGS' && (
        <section className={styles.logSection}>
          <div className={styles.panelHeading}>
            <div>
              <span>Append-only ledger</span>
              <h2>Nhật ký cộng và hoàn XP</h2>
            </div>
            <strong>{filteredLogs.length}/{logs.length}</strong>
          </div>

          <div className={styles.logToolbar}>
            <label className={styles.searchField}>
              <Search size={16} />
              <input
                value={logQuery}
                onChange={(event) => setLogQuery(event.target.value)}
                placeholder="Tìm người dùng, hoạt động, lý do, target..."
              />
            </label>

            <select
              value={logType}
              onChange={(event) => setLogType(event.target.value)}
              className={styles.plainSelect}
            >
              <option value="ALL">Mọi hoạt động</option>
              {logTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>

            <select
              value={logSign}
              onChange={(event) => setLogSign(event.target.value)}
              className={styles.plainSelect}
            >
              <option value="ALL">Cộng và trừ</option>
              <option value="POSITIVE">Chỉ cộng XP</option>
              <option value="NEGATIVE">Chỉ hoàn/trừ XP</option>
            </select>

            <select
              value={logUserId}
              onChange={(event) => setLogUserId(event.target.value)}
              className={styles.plainSelect}
            >
              <option value="ALL">Mọi người dùng</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} (@{user.username})
                </option>
              ))}
            </select>

            <button
              type="button"
              className={styles.resetButton}
              onClick={() => {
                setLogQuery('');
                setLogType('ALL');
                setLogSign('ALL');
                setLogUserId('ALL');
              }}
            >
              Đặt lại
            </button>
          </div>

          <div className={styles.logList}>
            {filteredLogs.map((log) => (
              <article key={log.id} className={styles.logRow}>
                <span
                  className={`${styles.logPoints} ${
                    log.points >= 0 ? styles.pointsPositive : styles.pointsNegative
                  }`}
                >
                  {log.points >= 0 ? '+' : ''}{formatNumber(log.points)}
                </span>

                <div className={styles.logMain}>
                  <div className={styles.logTitle}>
                    <strong>{log.typeLabel}</strong>
                    {log.reversedAt && <em>Đã reversal</em>}
                  </div>
                  <p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(log.userId);
                        setTab('OVERVIEW');
                      }}
                    >
                      {log.displayName} (@{log.username})
                    </button>
                    {log.reason && <span> · {log.reason}</span>}
                  </p>
                  <div className={styles.logMeta}>
                    <span>{formatDate(log.createdAt)}</span>
                    {log.targetId && <span>Target: {log.targetId}</span>}
                    {log.uniqueKey && (
                      <details>
                        <summary>Unique key</summary>
                        <code>{log.uniqueKey}</code>
                      </details>
                    )}
                    {Object.keys(log.metadata).length > 0 && (
                      <details>
                        <summary>Metadata</summary>
                        <code>{JSON.stringify(log.metadata)}</code>
                      </details>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {filteredLogs.length === 0 && (
              <div className={styles.emptyState}>Không có log phù hợp.</div>
            )}
          </div>
        </section>
      )}

      {tab === 'SETTINGS' && (
        <section className={styles.settingsGrid}>
          <form
            className={styles.settingsPanel}
            action="/api/admin/author-center/settings"
            method="post"
          >
            <div className={styles.panelHeading}>
              <div>
                <span>Cấu hình cảnh giới</span>
                <h2>Mốc XP và tiểu cảnh giới</h2>
              </div>
              <Settings2 size={20} />
            </div>

            <div className={styles.phaseSettings}>
              <label>
                <span>Mốc bắt đầu Trung kỳ (%)</span>
                <input
                  name="earlyPhasePercent"
                  type="number"
                  min="1"
                  max="98"
                  step="0.0001"
                  defaultValue={settings.earlyPhasePercent}
                  required
                />
              </label>
              <label>
                <span>Mốc bắt đầu Hậu kỳ (%)</span>
                <input
                  name="middlePhasePercent"
                  type="number"
                  min="2"
                  max="99"
                  step="0.0001"
                  defaultValue={settings.middlePhasePercent}
                  required
                />
              </label>
            </div>

            <div className={styles.realmSettings}>
              {settings.realms.map((realm, index) => (
                <label key={realm.id}>
                  <span>
                    <i>{index + 1}</i>
                    <strong>{realm.name}</strong>
                    <em>{realm.phaseCount} giai đoạn</em>
                  </span>
                  <input
                    name={`realmXp_${realm.id}`}
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={realm.requiredXp}
                    required
                  />
                </label>
              ))}
            </div>

            <p className={styles.settingsNote}>
              Cập nhật gần nhất: {formatDate(settings.updatedAt)}. Thay đổi mốc
              sẽ tác động cách hiển thị cảnh giới của toàn bộ tài khoản, nhưng
              không thay đổi tổng XP trong ledger.
            </p>

            <button type="submit" className={styles.primaryButton}>
              <Settings2 size={16} /> Lưu cấu hình cảnh giới
            </button>
          </form>

          <aside className={styles.recoveryPanel}>
            <div className={styles.panelHeading}>
              <div>
                <span>Công cụ phục hồi</span>
                <h2>Rebuild từ ledger</h2>
              </div>
              <RefreshCcw size={20} />
            </div>

            <div className={styles.recoveryInfo}>
              <AlertTriangle size={18} />
              <p>
                Rebuild sẽ lấy cultivation log làm nguồn sự thật và ghi lại
                <code> totalXp</code>, cảnh giới cùng XP trong cảnh giới cho
                các tài khoản có ledger.
              </p>
            </div>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleAudit}
              disabled={isPending}
            >
              <CircleGauge size={16} /> Audit trước khi rebuild
            </button>

            <div className={styles.dangerZone}>
              <strong>Rebuild toàn bộ tài khoản</strong>
              <p>
                Nhập chính xác <code>REBUILD_FROM_LOGS</code> để xác nhận.
              </p>
              <input
                value={rebuildConfirmation}
                onChange={(event) => setRebuildConfirmation(event.target.value)}
                placeholder="REBUILD_FROM_LOGS"
              />
              <button
                type="button"
                onClick={handleRebuildAll}
                disabled={isPending || rebuildConfirmation !== 'REBUILD_FROM_LOGS'}
              >
                <RefreshCcw size={16} /> Rebuild toàn hệ thống
              </button>
            </div>
          </aside>
        </section>
      )}

      {isPending && (
        <div className={styles.pending} role="status">
          <RefreshCcw size={16} /> Đang xử lý dữ liệu cultivation...
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className={`${styles.summaryCard} ${warning ? styles.summaryWarning : ''}`}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? styles.tabActive : undefined}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
