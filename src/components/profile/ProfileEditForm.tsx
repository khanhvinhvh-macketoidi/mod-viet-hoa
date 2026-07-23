'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import styles from './ProfileEditForm.module.css';

type InitialData = {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  facebook: string;
  youtube: string;
  discord: string;
  github: string;
  steam: string;
};

type Props = {
  initialData: InitialData;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export default function ProfileEditForm({ initialData }: Props) {
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function updateField(field: keyof InitialData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');
    setFieldErrors({});

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setFieldErrors(data.errors ?? {});
        throw new Error(data.message || 'Không thể cập nhật đạo tịch.');
      }

      setMessage(data.message || 'Đạo tịch đã được cập nhật thành công.');

      /*
       * Dùng điều hướng toàn trang thay vì router.refresh() + router.push().
       * router.refresh() có thể giữ App Router ở trạng thái Rendering khi
       * Server Component /profile đang được làm mới đồng thời.
       */
      window.location.assign('/profile');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể cập nhật đạo tịch.',
      );
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}
      {message && <div className={styles.success}>{message}</div>}

      <section className={styles.panel}>
        <div className={styles.sectionTitle}>
          <h2>Thông tin cơ bản</h2>
          <p>
            Đây là những thông tin đầu tiên mọi người nhìn thấy trên hồ sơ của
            đạo hữu.
          </p>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Tên hiển thị</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) =>
                updateField('displayName', event.target.value)
              }
              maxLength={60}
              required
            />
            <small>{form.displayName.length}/60 ký tự</small>
            {fieldErrors.displayName && (
              <em>{fieldErrors.displayName}</em>
            )}
          </label>

          <label className={styles.field}>
            <span>Vị trí</span>
            <input
              type="text"
              value={form.location}
              onChange={(event) =>
                updateField('location', event.target.value)
              }
              maxLength={80}
              placeholder="Ví dụ: TP. Hồ Chí Minh"
            />
            {fieldErrors.location && <em>{fieldErrors.location}</em>}
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Giới thiệu</span>
            <textarea
              value={form.bio}
              onChange={(event) => updateField('bio', event.target.value)}
              maxLength={500}
              rows={7}
              placeholder="Giới thiệu ngắn về đạo hữu, sở thích hoặc nội dung mod đang thực hiện..."
            />
            <small>{form.bio.length}/500 ký tự</small>
            {fieldErrors.bio && <em>{fieldErrors.bio}</em>}
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Trang web cá nhân</span>
            <input
              type="url"
              value={form.website}
              onChange={(event) =>
                updateField('website', event.target.value)
              }
              placeholder="https://example.com"
            />
            {fieldErrors.website && <em>{fieldErrors.website}</em>}
          </label>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionTitle}>
          <h2>Liên kết mạng xã hội</h2>
          <p>Chỉ những trường có nội dung mới được hiển thị công khai.</p>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>Facebook</span>
            <input
              type="url"
              value={form.facebook}
              onChange={(event) =>
                updateField('facebook', event.target.value)
              }
              placeholder="https://facebook.com/..."
            />
            {fieldErrors.facebook && <em>{fieldErrors.facebook}</em>}
          </label>

          <label className={styles.field}>
            <span>YouTube</span>
            <input
              type="url"
              value={form.youtube}
              onChange={(event) =>
                updateField('youtube', event.target.value)
              }
              placeholder="https://youtube.com/@..."
            />
            {fieldErrors.youtube && <em>{fieldErrors.youtube}</em>}
          </label>

          <label className={styles.field}>
            <span>GitHub</span>
            <input
              type="url"
              value={form.github}
              onChange={(event) =>
                updateField('github', event.target.value)
              }
              placeholder="https://github.com/..."
            />
            {fieldErrors.github && <em>{fieldErrors.github}</em>}
          </label>

          <label className={styles.field}>
            <span>Steam</span>
            <input
              type="url"
              value={form.steam}
              onChange={(event) =>
                updateField('steam', event.target.value)
              }
              placeholder="https://steamcommunity.com/..."
            />
            {fieldErrors.steam && <em>{fieldErrors.steam}</em>}
          </label>

          <label className={`${styles.field} ${styles.fullWidth}`}>
            <span>Discord</span>
            <input
              type="text"
              value={form.discord}
              onChange={(event) =>
                updateField('discord', event.target.value)
              }
              maxLength={100}
              placeholder="Tên người dùng Discord hoặc liên kết máy chủ"
            />
            {fieldErrors.discord && <em>{fieldErrors.discord}</em>}
          </label>
        </div>
      </section>

      <div className={styles.actions}>
        <Link href="/profile" className={styles.cancelButton}>
          Hủy
        </Link>

        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
