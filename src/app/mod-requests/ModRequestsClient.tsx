'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  ImagePlus,
  Plus,
  ThumbsUp,
  Trash2,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import type {
  ModRequestStatus,
  PublicModRequest,
} from '@/lib/mod-requests';
import styles from './mod-requests.module.css';

type Props = {
  initialRequests: PublicModRequest[];
  currentUser: {
    id: string;
    role: 'MEMBER' | 'MODDER' | 'ADMIN';
  } | null;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  request?: PublicModRequest;
  voted?: boolean;
  voteCount?: number;
};

const MAX_ILLUSTRATION_BYTES = 2 * 1024 * 1024;
const ALLOWED_ILLUSTRATION_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const STATUS_META: Record<
  ModRequestStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
  }
> = {
  OPEN: {
    label: 'Đang tiếp nhận',
    icon: Clock,
    className: styles.statusOpen,
  },
  PLANNED: {
    label: 'Đã lên kế hoạch',
    icon: CheckCircle,
    className: styles.statusPlanned,
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    icon: Wrench,
    className: styles.statusProgress,
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    icon: CheckCircle,
    className: styles.statusCompleted,
  },
  REJECTED: {
    label: 'Từ chối',
    icon: XCircle,
    className: styles.statusRejected,
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: styles.statusCancelled,
  },
};

const FILTERS: Array<{ value: 'ALL' | ModRequestStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'OPEN', label: 'Tiếp nhận' },
  { value: 'PLANNED', label: 'Kế hoạch' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

export default function ModRequestsClient({
  initialRequests,
  currentUser,
}: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<'ALL' | ModRequestStatus>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [illustrationFile, setIllustrationFile] = useState<File | null>(null);
  const [illustrationPreviewUrl, setIllustrationPreviewUrl] = useState('');
  const illustrationInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    game: '',
    description: '',
    sourceUrl: '',
  });

  const visibleRequests = useMemo(
    () =>
      filter === 'ALL'
        ? requests.filter((item) => item.status !== 'CANCELLED')
        : requests.filter((item) => item.status === filter),
    [filter, requests],
  );

  useEffect(() => {
    if (!illustrationFile) {
      setIllustrationPreviewUrl('');
      return;
    }

    const previewUrl = URL.createObjectURL(illustrationFile);
    setIllustrationPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [illustrationFile]);

  function clearIllustration() {
    setIllustrationFile(null);

    if (illustrationInputRef.current) {
      illustrationInputRef.current.value = '';
    }
  }

  function selectIllustration(file: File | null) {
    setError('');

    if (!file) {
      clearIllustration();
      return;
    }

    if (!ALLOWED_ILLUSTRATION_TYPES.has(file.type)) {
      clearIllustration();
      setError('Ảnh minh họa chỉ chấp nhận JPG, PNG hoặc WEBP.');
      return;
    }

    if (file.size <= 0 || file.size > MAX_ILLUSTRATION_BYTES) {
      clearIllustration();
      setError('Ảnh minh họa không được vượt quá 2 MB.');
      return;
    }

    setIllustrationFile(file);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser || saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.set('title', form.title);
      formData.set('game', form.game);
      formData.set('description', form.description);
      formData.set('sourceUrl', form.sourceUrl);

      if (illustrationFile) {
        formData.set('illustration', illustrationFile);
      }

      const response = await fetch('/api/mod-requests', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.request) {
        throw new Error(data.message || 'Không thể gửi yêu cầu.');
      }

      setRequests((current) => [data.request!, ...current]);
      setForm({
        title: '',
        game: '',
        description: '',
        sourceUrl: '',
      });
      clearIllustration();
      setFormOpen(false);
      setMessage(data.message || 'Đã gửi yêu cầu mod.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể gửi yêu cầu.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVote(requestId: string) {
    if (!currentUser) {
      window.location.assign('/login?next=/mod-requests');
      return;
    }

    if (workingId) return;
    setWorkingId(requestId);
    setError('');

    try {
      const response = await fetch(
        `/api/mod-requests/${encodeURIComponent(requestId)}/vote`,
        { method: 'POST' },
      );
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.message || 'Không thể bình chọn.');
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? {
                ...item,
                viewerHasVoted: Boolean(data.voted),
                voteCount: Number(data.voteCount ?? item.voteCount),
              }
            : item,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể bình chọn.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function cancelRequest(requestId: string) {
    if (
      !currentUser ||
      workingId ||
      !window.confirm('Hủy yêu cầu mod này?')
    ) {
      return;
    }

    setWorkingId(requestId);
    setError('');

    try {
      const response = await fetch(
        `/api/mod-requests/${encodeURIComponent(requestId)}`,
        { method: 'DELETE' },
      );
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.message || 'Không thể hủy yêu cầu.');
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: 'CANCELLED',
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể hủy yêu cầu.',
      );
    } finally {
      setWorkingId('');
    }
  }

  async function updateStatus(
    requestId: string,
    status: ModRequestStatus,
  ) {
    if (currentUser?.role !== 'ADMIN' || workingId) return;

    setWorkingId(requestId);
    setError('');

    try {
      const response = await fetch(
        `/api/mod-requests/${encodeURIComponent(requestId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.message || 'Không thể đổi trạng thái.');
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể đổi trạng thái.',
      );
    } finally {
      setWorkingId('');
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Lắng nghe cộng đồng</span>
            <h1>Yêu Cầu Mod</h1>
            <p>
              Đề xuất mod, công cụ hoặc bản Việt hóa đạo hữu mong muốn. Những
              yêu cầu được nhiều người đồng hành sẽ giúp đội ngũ ưu tiên tốt
              hơn, nhưng không phải cam kết bắt buộc thực hiện.
            </p>
          </div>

          {currentUser ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setFormOpen((current) => !current)}
            >
              <Plus size={18} />
              Gửi yêu cầu
            </button>
          ) : (
            <Link
              href="/login?next=/mod-requests"
              className={styles.primaryButton}
            >
              Đăng nhập để yêu cầu
            </Link>
          )}
        </header>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        {formOpen && currentUser && (
          <form className={styles.form} onSubmit={submitRequest}>
            <div className={styles.formGrid}>
              <label>
                <span>Tên yêu cầu</span>
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Việt hóa cốt truyện game..."
                />
              </label>
              <label>
                <span>Tên game</span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.game}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      game: event.target.value,
                    }))
                  }
                  placeholder="Tên game"
                />
              </label>
            </div>

            <label>
              <span>Mô tả chi tiết</span>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Nội dung mong muốn, phạm vi, phiên bản game..."
              />
            </label>

            <label>
              <span>Liên kết tham khảo (không bắt buộc)</span>
              <input
                type="url"
                maxLength={500}
                value={form.sourceUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sourceUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </label>

            <div className={styles.illustrationField}>
              <div className={styles.illustrationFieldHeader}>
                <div>
                  <span>Ảnh minh họa (không bắt buộc)</span>
                  <small>Một ảnh JPG, PNG hoặc WEBP, tối đa 2 MB.</small>
                </div>

                {illustrationFile && (
                  <button
                    type="button"
                    className={styles.removeIllustrationButton}
                    onClick={clearIllustration}
                    disabled={saving}
                  >
                    <X size={15} />
                    Bỏ ảnh
                  </button>
                )}
              </div>

              <label className={styles.illustrationPicker}>
                <input
                  ref={illustrationInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(event) =>
                    selectIllustration(event.target.files?.[0] ?? null)
                  }
                />

                {illustrationPreviewUrl ? (
                  <span className={styles.illustrationPreview}>
                    <Image
                      src={illustrationPreviewUrl}
                      alt="Xem trước ảnh minh họa"
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 760px"
                    />
                  </span>
                ) : (
                  <span className={styles.illustrationPlaceholder}>
                    <ImagePlus size={28} />
                    <strong>Chọn ảnh minh họa</strong>
                    <small>Ảnh giúp quản trị viên nhận diện mod nhanh hơn.</small>
                  </span>
                )}
              </label>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Đóng
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        )}

        <nav className={styles.filters} aria-label="Lọc yêu cầu mod">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? styles.filterActive : ''}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className={styles.list}>
          {visibleRequests.map((item) => {
            const status = STATUS_META[item.status];
            const StatusIcon = status.icon;
            const canCancel =
              currentUser &&
              (currentUser.role === 'ADMIN' ||
                (currentUser.id === item.userId &&
                  item.status === 'OPEN'));

            return (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <span className={styles.game}>{item.game}</span>
                    <h2>{item.title}</h2>
                  </div>
                  <span
                    className={`${styles.status} ${status.className}`}
                  >
                    <StatusIcon size={14} />
                    {status.label}
                  </span>
                </div>

                {item.illustrationUrl && (
                  <div className={styles.cardIllustration}>
                    <Image
                      src={item.illustrationUrl}
                      alt={`Ảnh minh họa cho ${item.title}`}
                      fill
                      unoptimized
                      sizes="(max-width: 720px) 100vw, 1080px"
                    />
                  </div>
                )}

                <p className={styles.description}>{item.description}</p>

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceLink}
                  >
                    <ExternalLink size={15} />
                    Mở liên kết tham khảo
                  </a>
                )}

                <div className={styles.meta}>
                  <span>Đề xuất bởi {item.userName}</span>
                  <span>
                    {new Intl.DateTimeFormat('vi-VN', {
                      dateStyle: 'medium',
                    }).format(new Date(item.createdAt))}
                  </span>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={
                      item.viewerHasVoted ? styles.votedButton : ''
                    }
                    disabled={
                      workingId === item.id ||
                      item.status === 'CANCELLED'
                    }
                    onClick={() => void toggleVote(item.id)}
                  >
                    <ThumbsUp size={16} />
                    {item.voteCount}
                    <span>
                      {item.viewerHasVoted ? 'Đã đồng hành' : 'Đồng hành'}
                    </span>
                  </button>

                  {canCancel && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      disabled={workingId === item.id}
                      onClick={() => void cancelRequest(item.id)}
                    >
                      <Trash2 size={16} />
                      Hủy
                    </button>
                  )}

                  {currentUser?.role === 'ADMIN' && (
                    <select
                      aria-label="Trạng thái yêu cầu"
                      value={item.status}
                      disabled={workingId === item.id}
                      onChange={(event) =>
                        void updateStatus(
                          item.id,
                          event.target.value as ModRequestStatus,
                        )
                      }
                    >
                      {Object.entries(STATUS_META).map(
                        ([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ),
                      )}
                    </select>
                  )}
                </div>
              </article>
            );
          })}

          {visibleRequests.length === 0 && (
            <div className={styles.empty}>
              Chưa có yêu cầu phù hợp với bộ lọc này.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
