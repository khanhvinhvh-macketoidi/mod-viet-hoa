'use client';

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CheckCircle2,
  ImageIcon,
  Package,
  Trash2,
  UploadCloud,
} from 'lucide-react';

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_MOD_SIZE = 200 * 1024 * 1024;

const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, unitIndex);

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export default function UploadFields() {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const modInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modFile, setModFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  const [coverPositionX, setCoverPositionX] = useState(50);
const [coverPositionY, setCoverPositionY] = useState(50);

const dragStartRef = useRef<{
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
} | null>(null);

  const [coverDragging, setCoverDragging] = useState(false);
  const [modDragging, setModDragging] = useState(false);

  const [coverError, setCoverError] = useState('');
  const [modError, setModError] = useState('');

  useEffect(() => {
    const previewUrlRef = coverPreviewUrlRef;

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function assignFileToInput(
    input: HTMLInputElement | null,
    file: File,
  ): void {
    if (!input) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
  }

  function validateCover(file: File): string {
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      return 'Ảnh bìa chỉ hỗ trợ JPG, PNG hoặc WEBP.';
    }

    if (file.size > MAX_COVER_SIZE) {
      return 'Ảnh bìa không được vượt quá 10 MB.';
    }

    return '';
  }

  function validateMod(file: File): string {
    if (file.size > MAX_MOD_SIZE) {
      return 'File mod không được vượt quá 200 MB.';
    }

    return '';
  }

  function selectCover(file: File): void {
    const error = validateCover(file);

    if (error) {
      setCoverError(error);
      return;
    }

    setCoverError('');

    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
    }

    const previewUrl = URL.createObjectURL(file);
    coverPreviewUrlRef.current = previewUrl;
    setCoverPreview(previewUrl);
    setCoverFile(file);
    assignFileToInput(coverInputRef.current, file);
  }

  function selectMod(file: File): void {
    const error = validateMod(file);

    if (error) {
      setModError(error);
      return;
    }

    setModError('');
    setModFile(file);
    assignFileToInput(modInputRef.current, file);
  }

  function handleCoverChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0];

    if (file) {
      selectCover(file);
    }
  }

  function handleModChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const file = event.target.files?.[0];

    if (file) {
      selectMod(file);
    }
  }

  function handleCoverDrop(
    event: DragEvent<HTMLDivElement>,
  ): void {
    event.preventDefault();
    setCoverDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      selectCover(file);
    }
  }

  function handleModDrop(
    event: DragEvent<HTMLDivElement>,
  ): void {
    event.preventDefault();
    setModDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      selectMod(file);
    }
  }

  function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function handlePreviewPointerDown(
  event: React.PointerEvent<HTMLDivElement>,
): void {
  event.preventDefault();

  event.currentTarget.setPointerCapture(event.pointerId);

  dragStartRef.current = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    positionX: coverPositionX,
    positionY: coverPositionY,
  };
}

function handlePreviewPointerMove(
  event: React.PointerEvent<HTMLDivElement>,
): void {
  const start = dragStartRef.current;

  if (!start) return;

  const bounds = event.currentTarget.getBoundingClientRect();

  const deltaX =
    ((event.clientX - start.pointerX) / bounds.width) * 100;

  const deltaY =
    ((event.clientY - start.pointerY) / bounds.height) * 100;

  setCoverPositionX(clamp(start.positionX - deltaX));
  setCoverPositionY(clamp(start.positionY - deltaY));
}

function handlePreviewPointerUp(
  event: React.PointerEvent<HTMLDivElement>,
): void {
  dragStartRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

  function clearCover(): void {
  if (coverPreviewUrlRef.current) {
    URL.revokeObjectURL(coverPreviewUrlRef.current);
    coverPreviewUrlRef.current = null;
  }

  setCoverFile(null);
  setCoverPreview('');
  setCoverError('');
  setCoverPositionX(50);
  setCoverPositionY(50);

  if (coverInputRef.current) {
    coverInputRef.current.value = '';
  }
}

  function clearMod(): void {
    setModFile(null);
    setModError('');

    if (modInputRef.current) {
      modInputRef.current.value = '';
    }
  }

  return (
    <div className="grid gap-6">
      {/* Ảnh bìa */}
      <div className="grid gap-2">
        <div>
          <label className="text-sm font-bold text-slate-100">
            Ảnh bìa mod
          </label>

          <p className="mt-1 text-xs text-slate-500">
            JPG, PNG hoặc WEBP · Tối đa 10 MB · Khuyến nghị 16:9
          </p>
        </div>

        <input
          ref={coverInputRef}
          id="cover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="hidden"
          onChange={handleCoverChange}
        />

        <input
        type="hidden"
        name="coverPositionX"
        value={coverPositionX}
        />

<input
  type="hidden"
  name="coverPositionY"
  value={coverPositionY}
/>

        {!coverFile ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => coverInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                coverInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setCoverDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setCoverDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setCoverDragging(false);
            }}
            onDrop={handleCoverDrop}
            className={`
              group flex min-h-48 cursor-pointer flex-col
              items-center justify-center rounded-2xl border-2
              border-dashed px-6 py-8 text-center transition
              duration-200
              ${
                coverDragging
                  ? 'border-amber-300 bg-amber-400/10'
                  : 'border-slate-700 bg-slate-900/70 hover:border-amber-400 hover:bg-slate-900'
              }
            `}
          >
            <div
              className="
                mb-4 flex h-14 w-14 items-center justify-center
                rounded-2xl bg-amber-400/10 text-amber-400
                transition group-hover:scale-105
                group-hover:bg-amber-400/20
              "
            >
              {coverDragging ? (
                <UploadCloud className="h-7 w-7" />
              ) : (
                <ImageIcon className="h-7 w-7" />
              )}
            </div>

            <p className="font-bold text-slate-100">
              {coverDragging
                ? 'Thả ảnh vào đây'
                : 'Chọn hoặc kéo ảnh bìa vào đây'}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Nhấn vào khung để mở trình chọn ảnh
            </p>
          </div>
        ) : (
          <div
            className="
              overflow-hidden rounded-2xl border border-slate-700
              bg-slate-900
            "
          >
            <div
                className="
                    relative aspect-video touch-none select-none
                    overflow-hidden bg-slate-950 cursor-move
                "
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={handlePreviewPointerUp}
                onPointerCancel={handlePreviewPointerUp}
            >
  {coverPreview ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverPreview}
        alt="Xem trước ảnh bìa"
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
        style={{
            objectPosition: `${coverPositionX}% ${coverPositionY}%`,
        }}
    />

    <div
        className="
        pointer-events-none absolute left-4 top-4
        rounded-full bg-black/70 px-3 py-1.5
        text-xs font-semibold text-white
        backdrop-blur-sm
     "
    >
        Giữ chuột và kéo để chỉnh vị trí ảnh
    </div>

    </>
  ) : (
    <div className="flex h-full w-full items-center justify-center text-slate-500">
      Đang tạo ảnh xem trước...
    </div>
  )}

              <div
                className="
                  absolute inset-0 bg-gradient-to-t
                  from-black/70 via-transparent to-transparent
                "
              />

              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                <span className="text-sm font-bold text-white">
                  Đã chọn ảnh bìa
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-4">
  <div className="min-w-0">
    <p className="truncate font-semibold text-slate-100">
      {coverFile.name}
    </p>

    <p className="mt-1 text-xs text-slate-500">
      {formatFileSize(coverFile.size)}
    </p>
  </div>

  <div className="flex shrink-0 items-center gap-2">
    <button
      type="button"
      onClick={() => {
        setCoverPositionX(50);
        setCoverPositionY(50);
      }}
      className="
        rounded-xl border border-slate-600
        bg-slate-800 px-3 py-2
        text-sm font-semibold text-slate-200
        transition hover:bg-slate-700
      "
    >
      Căn giữa
    </button>

    <button
      type="button"
      onClick={clearCover}
      className="
        flex items-center gap-2 rounded-xl
        border border-red-400/20 bg-red-500/10
        px-3 py-2 text-sm font-semibold text-red-300
        transition hover:bg-red-500/20
      "
    >
      <Trash2 className="h-4 w-4" />
      Xóa ảnh
    </button>
  </div>
</div>
          </div>
        )}

        {coverError && (
          <p className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {coverError}
          </p>
        )}
      </div>

      {/* File mod */}
      <div className="grid gap-2">
        <div>
          <label className="text-sm font-bold text-slate-100">
            File mod để tải xuống
          </label>

          <p className="mt-1 text-xs text-slate-500">
            ZIP, RAR, 7Z hoặc định dạng mod phù hợp · Tối đa 200 MB
          </p>
        </div>

        <input
          ref={modInputRef}
          id="modFile"
          name="file"
          type="file"
          required
          className="hidden"
          onChange={handleModChange}
        />

        {!modFile ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => modInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                modInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setModDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setModDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setModDragging(false);
            }}
            onDrop={handleModDrop}
            className={`
              group flex min-h-40 cursor-pointer flex-col
              items-center justify-center rounded-2xl border-2
              border-dashed px-6 py-8 text-center transition
              duration-200
              ${
                modDragging
                  ? 'border-sky-300 bg-sky-400/10'
                  : 'border-slate-700 bg-slate-900/70 hover:border-sky-400 hover:bg-slate-900'
              }
            `}
          >
            <div
              className="
                mb-4 flex h-14 w-14 items-center justify-center
                rounded-2xl bg-sky-400/10 text-sky-400
                transition group-hover:scale-105
                group-hover:bg-sky-400/20
              "
            >
              {modDragging ? (
                <UploadCloud className="h-7 w-7" />
              ) : (
                <Package className="h-7 w-7" />
              )}
            </div>

            <p className="font-bold text-slate-100">
              {modDragging
                ? 'Thả file mod vào đây'
                : 'Chọn hoặc kéo file mod vào đây'}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Nhấn vào khung để mở trình chọn file
            </p>
          </div>
        ) : (
          <div
            className="
              flex items-center justify-between gap-4 rounded-2xl
              border border-sky-400/20 bg-sky-400/5 p-4
            "
          >
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="
                  flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-xl bg-sky-400/10 text-sky-400
                "
              >
                <Package className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-100">
                    {modFile.name}
                  </p>

                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(modFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearMod}
              className="
                flex shrink-0 items-center gap-2 rounded-xl
                border border-red-400/20 bg-red-500/10
                px-3 py-2 text-sm font-semibold text-red-300
                transition hover:bg-red-500/20
              "
            >
              <Trash2 className="h-4 w-4" />
              Xóa file
            </button>
          </div>
        )}

        {modError && (
          <p className="rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-300">
            {modError}
          </p>
        )}
      </div>
    </div>
  );
}