'use client';

import {
  ChangeEvent,
  PointerEvent,
  useRef,
  useState,
} from 'react';
import styles from './ProfileMediaEditor.module.css';

type CoverPosition = {
  x: number;
  y: number;
};

type Props = {
  initialAvatar: string;
  initialCover: string;
  initialCoverPosition: CoverPosition;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  avatar?: string;
  coverImage?: string;
  coverPosition?: CoverPosition;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export default function ProfileMediaEditor({
  initialAvatar,
  initialCover,
  initialCoverPosition,
}: Props) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [cover, setCover] = useState(initialCover);
  const [position, setPosition] = useState(initialCoverPosition);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [positionSaving, setPositionSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  function validateFile(file: File, maxBytes: number): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.';
    }

    if (file.size > maxBytes) {
      return `Dung lượng ảnh không được vượt quá ${Math.round(
        maxBytes / 1024 / 1024,
      )} MB.`;
    }

    return null;
  }

  async function uploadFile(
    endpoint: string,
    file: File,
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as ApiResponse;

    if (!response.ok) {
      throw new Error(data.message || 'Không thể tải ảnh lên.');
    }

    return data;
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateFile(file, 5 * 1024 * 1024);

    if (validationError) {
      setError(validationError);
      return;
    }

    setAvatarUploading(true);
    setError('');
    setMessage('');

    try {
      const data = await uploadFile('/api/profile/avatar', file);

      if (data.avatar) {
        setAvatar(data.avatar);
      }

      setMessage(data.message || 'Đã cập nhật ảnh đại diện.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể cập nhật ảnh đại diện.',
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateFile(file, 10 * 1024 * 1024);

    if (validationError) {
      setError(validationError);
      return;
    }

    setCoverUploading(true);
    setError('');
    setMessage('');

    try {
      const data = await uploadFile('/api/profile/cover', file);

      if (data.coverImage) {
        setCover(data.coverImage);
      }

      if (data.coverPosition) {
        setPosition(data.coverPosition);
      } else {
        setPosition({ x: 50, y: 50 });
      }

      setMessage(data.message || 'Đã cập nhật ảnh bìa.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể cập nhật ảnh bìa.',
      );
    } finally {
      setCoverUploading(false);
    }
  }

  async function removeCover() {
    const confirmed = window.confirm(
      'Đạo hữu có chắc muốn xóa ảnh bìa hiện tại?',
    );

    if (!confirmed) return;

    setCoverUploading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/profile/cover', {
        method: 'DELETE',
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.message || 'Không thể xóa ảnh bìa.');
      }

      setCover('');
      setPosition({ x: 50, y: 50 });
      setMessage(data.message || 'Đã xóa ảnh bìa.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể xóa ảnh bìa.',
      );
    } finally {
      setCoverUploading(false);
    }
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!cover) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>,
  ) {
    const start = dragStart.current;

    if (!start || !cover) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const deltaX =
      ((event.clientX - start.pointerX) / Math.max(rect.width, 1)) *
      100;
    const deltaY =
      ((event.clientY - start.pointerY) /
        Math.max(rect.height, 1)) *
      100;

    setPosition({
      x: clamp(start.startX - deltaX),
      y: clamp(start.startY - deltaY),
    });
  }

  function handlePointerUp(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStart.current = null;
  }

  async function saveCoverPosition() {
    setPositionSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        '/api/profile/cover-position',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(position),
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.message || 'Không thể lưu vị trí ảnh bìa.',
        );
      }

      if (data.coverPosition) {
        setPosition(data.coverPosition);
      }

      setMessage(data.message || 'Đã lưu vị trí ảnh bìa.');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể lưu vị trí ảnh bìa.',
      );
    } finally {
      setPositionSaving(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.sectionTitle}>
        <h2>Pháp tướng đạo tịch</h2>
        <p>
          Tải ảnh đại diện và ảnh bìa. Đạo hữu có thể kéo ảnh bìa để
          chọn vị trí hiển thị phù hợp.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {message && <div className={styles.success}>{message}</div>}

      <div className={styles.avatarSection}>
        <div className={styles.avatarFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt="Ảnh đại diện hiện tại"
            onError={(event) => {
              event.currentTarget.src =
                '/images/default-avatar.png';
            }}
          />
        </div>

        <div className={styles.avatarInfo}>
          <strong>Ảnh đại diện</strong>
          <span>JPG, PNG hoặc WebP. Tối đa 5 MB.</span>

          <label className={styles.uploadButton}>
            {avatarUploading
              ? 'Đang tải lên...'
              : 'Chọn ảnh đại diện'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={avatarUploading}
              onChange={handleAvatarChange}
            />
          </label>
        </div>
      </div>

      <div className={styles.coverSection}>
        <div className={styles.coverHeader}>
          <div>
            <strong>Ảnh bìa</strong>
            <span>JPG, PNG hoặc WebP. Tối đa 10 MB.</span>
          </div>

          <div className={styles.coverActions}>
            <label className={styles.uploadButton}>
              {coverUploading
                ? 'Đang xử lý...'
                : cover
                  ? 'Thay ảnh bìa'
                  : 'Chọn ảnh bìa'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={coverUploading}
                onChange={handleCoverChange}
              />
            </label>

            {cover && (
              <button
                type="button"
                className={styles.removeButton}
                disabled={coverUploading}
                onClick={() => void removeCover()}
              >
                Xóa ảnh
              </button>
            )}
          </div>
        </div>

        <div
          className={`${styles.coverPreview} ${
            cover ? styles.draggable : ''
          }`}
          style={
            cover
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(3, 8, 20, 0.08), rgba(3, 8, 20, 0.5)), url("${cover}")`,
                  backgroundPosition: `${position.x}% ${position.y}%`,
                }
              : undefined
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {!cover ? (
            <span>Chưa có ảnh bìa</span>
          ) : (
            <span className={styles.dragHint}>
              Kéo ảnh để điều chỉnh vị trí
            </span>
          )}
        </div>

        {cover && (
          <div className={styles.positionRow}>
            <span>
              Vị trí: X {Math.round(position.x)}% · Y{' '}
              {Math.round(position.y)}%
            </span>

            <button
              type="button"
              className={styles.savePositionButton}
              disabled={positionSaving}
              onClick={() => void saveCoverPosition()}
            >
              {positionSaving
                ? 'Đang lưu...'
                : 'Lưu vị trí ảnh bìa'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
