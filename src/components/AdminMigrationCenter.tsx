'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AdminMigrationCenter.module.css';

type MigrationState = {
  completedAt: string;
  result: {
    backup?: { directory?: string };
    usersTotal?: number;
    usersUpdated?: number;
    modsTotal?: number;
    modsLinked?: number;
    modsAlreadyLinked?: number;
    unmatchedMods?: unknown[];
  };
};

type UserOption = {
  id: string;
  name: string;
  displayName: string;
  role: string;
};

type Suggestion = { user: UserOption; score: number };

type PendingMod = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  suggestions: Suggestion[];
};

type MappingData = {
  pendingMods: PendingMod[];
  users: UserOption[];
  totalMods: number;
  linkedMods: number;
  pendingCount: number;
};

type Tab = 'summary' | 'mapping' | 'log';

function formatDate(value?: string) {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(date);
}

export default function AdminMigrationCenter() {
  const [tab, setTab] = useState<Tab>('summary');
  const [completed, setCompleted] = useState(false);
  const [state, setState] = useState<MigrationState | null>(null);
  const [mapping, setMapping] = useState<MappingData | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/admin/migrations/user-profile', {
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể đọc migration.');
    setCompleted(Boolean(data.completed));
    setState(data.state ?? null);
  }, []);

  const loadMapping = useCallback(async () => {
    const response = await fetch('/api/admin/migrations/author-mapping', {
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể đọc Author Mapping.');
    setMapping(data);
    setSelected((current) => {
      const next = { ...current };
      for (const mod of data.pendingMods as PendingMod[]) {
        if (!next[mod.id] && mod.suggestions[0]?.user.id) {
          next[mod.id] = mod.suggestions[0].user.id;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      Promise.all([loadStatus(), loadMapping()]).catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể tải dữ liệu.',
        );
      });
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadStatus, loadMapping]);

  const result = state?.result;
  const pending = mapping?.pendingCount ?? result?.unmatchedMods?.length ?? 0;

  const cards = useMemo(
    () => [
      ['Tổng đạo tịch', result?.usersTotal ?? 0],
      ['Đạo tịch đã cập nhật', result?.usersUpdated ?? 0],
      ['Tổng mod', mapping?.totalMods ?? result?.modsTotal ?? 0],
      ['Mod đã liên kết', mapping?.linkedMods ?? 0],
      ['Cần liên kết thủ công', pending],
      ['Trạng thái', completed ? 'Hoàn tất' : 'Chưa chạy'],
    ],
    [completed, mapping, pending, result],
  );

  async function runMigration() {
    if (!window.confirm('Chạy migration một lần? Dữ liệu sẽ được backup trước khi ghi.')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/migrations/user-profile', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Migration thất bại.');
      setCompleted(true);
      setState(data.state);
      setNotice('Migration User Profile đã hoàn tất.');
      await loadMapping();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Migration thất bại.');
    } finally {
      setBusy(false);
    }
  }

  async function linkAuthor(modId: string) {
    const userId = selected[modId];
    if (!userId) return setError('Hãy chọn một đạo tịch.');
    setLinkingId(modId);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/migrations/author-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId, userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể liên kết tác giả.');
      setNotice(data.message || 'Đã liên kết tác giả.');
      await loadMapping();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể liên kết tác giả.');
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <section className={styles.shell}>
      <nav className={styles.tabs}>
        <button className={tab === 'summary' ? styles.active : styles.tab} onClick={() => setTab('summary')}>Tổng quan</button>
        <button className={tab === 'mapping' ? styles.active : styles.tab} onClick={() => setTab('mapping')}>
          Liên kết tác giả {pending > 0 && <span className={styles.badge}>{pending}</span>}
        </button>
        <button className={tab === 'log' ? styles.active : styles.tab} onClick={() => setTab('log')}>Nhật ký</button>
      </nav>

      {error && <div className={styles.error}>{error}</div>}
      {notice && <div className={styles.success}>{notice}</div>}

      {tab === 'summary' && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div>
              <h2>User Profile Migration v1</h2>
              <p>Chuẩn hóa hồ sơ, tạo profileSlug duy nhất, liên kết authorId và sao lưu dữ liệu.</p>
            </div>
            <button className={styles.primary} disabled={completed || busy} onClick={runMigration}>
              {busy ? 'Đang migration...' : completed ? 'Đã chạy migration' : 'Chạy migration một lần'}
            </button>
          </div>

          <div className={styles.status}>
            <strong>{completed ? 'Migration đã hoàn tất' : 'Migration chưa chạy'}</strong>
            {state?.completedAt && <span>{formatDate(state.completedAt)}</span>}
          </div>

          <div className={styles.grid}>
            {cards.map(([label, value]) => (
              <article className={styles.stat} key={String(label)}>
                <span>{label}</span><strong>{value}</strong>
              </article>
            ))}
          </div>

          {result?.backup?.directory && (
            <div className={styles.backup}><strong>Thư mục backup</strong><code>{result.backup.directory}</code></div>
          )}
        </div>
      )}

      {tab === 'mapping' && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div><h2>Manual Author Mapping</h2><p>Chọn đúng tài khoản cho mod chưa có authorId. Tên tác giả cũ vẫn được giữ nguyên.</p></div>
            <button className={styles.secondary} onClick={() => loadMapping().catch((e) => setError(e.message))}>Làm mới</button>
          </div>

          {mapping?.pendingMods.length ? (
            <div className={styles.list}>
              {mapping.pendingMods.map((mod) => (
                <article className={styles.card} key={mod.id}>
                  <div className={styles.cover}>
                    {mod.coverUrl ? <img src={mod.coverUrl} alt="" /> : <span>MOD</span>}
                  </div>
                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <h3>{mod.title}</h3>
                      {mod.suggestions[0] && <span className={styles.suggest}>Gợi ý {mod.suggestions[0].score}%</span>}
                    </div>
                    <div className={styles.oldAuthor}><span>Tác giả cũ</span><strong>{mod.author || 'Không có thông tin'}</strong></div>
                    <div className={styles.controls}>
                      <select value={selected[mod.id] ?? ''} onChange={(e) => setSelected((v) => ({ ...v, [mod.id]: e.target.value }))}>
                        <option value="">-- Chọn đạo tịch --</option>
                        {mapping.users.map((user) => {
                          const suggestion = mod.suggestions.find((item) => item.user.id === user.id);
                          return <option key={user.id} value={user.id}>{user.displayName} ({user.name}){suggestion ? ` — gợi ý ${suggestion.score}%` : ''}</option>;
                        })}
                      </select>
                      <button className={styles.primary} disabled={!selected[mod.id] || linkingId === mod.id} onClick={() => linkAuthor(mod.id)}>
                        {linkingId === mod.id ? 'Đang liên kết...' : 'Liên kết'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}><strong>Toàn bộ mod đã được liên kết tác giả.</strong></div>
          )}
        </div>
      )}

      {tab === 'log' && (
        <div className={styles.panel}>
          <h2>Migration Log</h2>
          <div className={styles.logs}>
            <article><b>✓</b><div><strong>Migration User Profile</strong><p>{completed ? `Hoàn tất lúc ${formatDate(state?.completedAt)}.` : 'Chưa chạy.'}</p></div></article>
            <article><b>✓</b><div><strong>Chuẩn hóa đạo tịch</strong><p>{result?.usersUpdated ?? 0} đạo tịch đã được cập nhật.</p></div></article>
            <article><b>{pending ? '!' : '✓'}</b><div><strong>Liên kết tác giả</strong><p>{pending ? `${pending} mod còn chờ xử lý.` : 'Toàn bộ mod đã có authorId.'}</p></div></article>
            <article><b>✓</b><div><strong>Backup</strong><p>{result?.backup?.directory || 'Chưa có thông tin.'}</p></div></article>
          </div>
        </div>
      )}
    </section>
  );
}
