'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  cancelChunkedUploadSession,
  submitChunkedUploadMetadata,
  uploadFileInChunks,
} from '@/lib/client/chunked-file-upload';
import { normalizeExternalDownloadUrl } from '@/lib/download-source';

type ChunkedModUploadFormProps = {
  children: ReactNode;
};

export default function ChunkedModUploadForm({
  children,
}: ChunkedModUploadFormProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (submitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('clientSubmissionId', crypto.randomUUID());

    const downloadSource =
      formData.get('downloadSource') === 'EXTERNAL'
        ? 'EXTERNAL'
        : 'LOCAL';

    setSubmitting(true);
    setError('');
    setProgress(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let sessionId = '';
    let modCreated = false;

    try {
      if (downloadSource === 'EXTERNAL') {
        const externalDownloadUrl = normalizeExternalDownloadUrl(
          formData.get('externalDownloadUrl'),
        );

        formData.delete('file');
        formData.delete('uploadSessionId');
        formData.set('downloadSource', 'EXTERNAL');
        formData.set('externalDownloadUrl', externalDownloadUrl);
        setProgress(70);
        setStatus('Đang lưu thông tin và link tải ngoài...');
      } else {
        const file = formData.get('file');

        if (!(file instanceof File) || file.size <= 0) {
          throw new Error('Vui lòng chọn file mod.');
        }

        setStatus('Đang khởi tạo phiên tải file...');

        const uploaded = await uploadFileInChunks(file, {
          signal: abortController.signal,
          onProgress: ({ receivedBytes, totalBytes }) => {
            setProgress(
              Math.min(
                90,
                Math.round((receivedBytes / totalBytes) * 90),
              ),
            );
            setStatus(
              `Đang tải file mod: ${(receivedBytes / 1024 / 1024).toFixed(1)} / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`,
            );
          },
        });

        sessionId = uploaded.sessionId;
        formData.delete('file');
        formData.delete('externalDownloadUrl');
        formData.set('downloadSource', 'LOCAL');
        formData.set('uploadSessionId', sessionId);
        setProgress(94);
        setStatus('Đang lưu thông tin, ảnh bìa và gallery...');
      }

      await submitChunkedUploadMetadata(
        '/api/mods',
        formData,
        abortController.signal,
      );

      modCreated = true;
      setProgress(100);
      setStatus('Đăng mod thành công. Đang chuyển trang...');
      window.location.assign('/mods/upload?ok=1');
    } catch (submitError) {
      setError(
        abortController.signal.aborted
          ? 'Đã hủy đăng mod.'
          : submitError instanceof Error
            ? submitError.message
            : 'Không thể đăng mod.',
      );
    } finally {
      if (sessionId && !modCreated) {
        await cancelChunkedUploadSession(sessionId);
      }

      abortControllerRef.current = null;
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      {children}

      {(submitting || progress > 0) && (
        <div
          className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-sky-100">
              {status || 'Đang chuẩn bị...'}
            </span>
            <span className="shrink-0 font-bold text-sky-300">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!hydrated || submitting}
          className="min-w-40 flex-1 rounded-xl bg-amber-400 p-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!hydrated
            ? 'Đang khởi tạo...'
            : submitting
              ? 'Đang đăng mod...'
              : 'Đăng mod'}
        </button>

        {submitting && (
          <button
            type="button"
            onClick={() => abortControllerRef.current?.abort()}
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
          >
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}
