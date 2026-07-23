'use client';

import {
  ChangeEvent,
  DragEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  CheckCircle2,
  ImageIcon,
  Package,
  RotateCcw,
  Trash2,
  UploadCloud,
} from 'lucide-react';

type EditUploadFieldsProps = {
  currentCoverUrl: string;
  currentCoverPositionX?: number;
  currentCoverPositionY?: number;
  currentFileName: string;
  currentFileSize: number;
};

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_MOD_SIZE = 200 * 1024 * 1024;

const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

function formatFileSize(bytes: number): string {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function clampPosition(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export default function EditUploadFields({
  currentCoverUrl,
  currentCoverPositionX = 50,
  currentCoverPositionY = 50,
  currentFileName,
  currentFileSize,
}: EditUploadFieldsProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const modInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewUrlRef = useRef<string | null>(null);

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    positionX: number;
    positionY: number;
  } | null>(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [modFile, setModFile] = useState<File | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string>(currentCoverUrl);

  const [coverPositionX, setCoverPositionX] = useState(
    currentCoverPositionX,
  );

  const [coverPositionY, setCoverPositionY] = useState(
    currentCoverPositionY,
  );

  const [coverDragging, setCoverDragging] = useState(false);
  const [modDragging, setModDragging] = useState(false);

  const [coverError, setCoverError] = useState('');
  const [modError, setModError] = useState('');

  /*
   * Khi chọn ảnh mới, tạo URL tạm để xem trước.
   * Khi ảnh thay đổi hoặc component bị gỡ, URL tạm được giải phóng.
   */
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
    if (!input) {
      return;
    }

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

  function validateModFile(file: File): string {
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

    /*
     * Khi chọn ảnh mới, đặt ảnh về giữa.
     * Người dùng có thể kéo lại sau đó.
     */
    setCoverPositionX(50);
    setCoverPositionY(50);

    assignFileToInput(coverInputRef.current, file);
  }

  function selectModFile(file: File): void {
    const error = validateModFile(file);

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
      selectModFile(file);
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
      selectModFile(file);
    }
  }

  function handlePreviewPointerDown(
    event: PointerEvent<HTMLDivElement>,
  ): void {
    if (!coverPreview) {
      return;
    }

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
    event: PointerEvent<HTMLDivElement>,
  ): void {
    const start = dragStartRef.current;

    if (!start) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();

    const deltaX =
      ((event.clientX - start.pointerX) / bounds.width) * 100;

    const deltaY =
      ((event.clientY - start.pointerY) / bounds.height) * 100;

    setCoverPositionX(
      clampPosition(start.positionX - deltaX),
    );

    setCoverPositionY(
      clampPosition(start.positionY - deltaY),
    );
  }

  function handlePreviewPointerUp(
    event: PointerEvent<HTMLDivElement>,
  ): void {
    dragStartRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  }

  function centerCover(): void {
    setCoverPositionX(50);
    setCoverPositionY(50);
  }

  /*
   * Bỏ ảnh mới và quay lại ảnh hiện tại của mod.
   */
  function restoreCurrentCover(): void {
    if (coverPreviewUrlRef.current) {
      URL.revokeObjectURL(coverPreviewUrlRef.current);
      coverPreviewUrlRef.current = null;
    }

    setCoverFile(null);
    setCoverPreview(currentCoverUrl);
    setCoverError('');

    setCoverPositionX(currentCoverPositionX);
    setCoverPositionY(currentCoverPositionY);

    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }

  function clearModFile(): void {
    setModFile(null);
    setModError('');

    if (modInputRef.current) {
      modInputRef.current.value = '';
    }
  }

  return (
    <div className="grid gap-8">
      {/* Giá trị vị trí được gửi cùng form */}
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

      {/* Ảnh bìa */}
      <section
        className="
          rounded-2xl border border-white/10
          bg-slate-950/40 p-5
        "
      >
        <div>
          <h2 className="font-bold text-slate-100">
            Ảnh bìa
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Kéo trực tiếp ảnh để điều chỉnh vùng hiển thị.
            Chọn ảnh mới là không bắt buộc.
          </p>
        </div>

        <input
          ref={coverInputRef}
          id="editCover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />

        {coverPreview ? (
          <div
            className="
              mt-5 overflow-hidden rounded-2xl
              border border-white/10 bg-slate-900
            "
          >
            <div
              className="
                relative aspect-video cursor-move
                touch-none select-none overflow-hidden
                bg-slate-950
              "
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onPointerCancel={handlePreviewPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Xem trước ảnh bìa"
                draggable={false}
                className="
                  pointer-events-none
                  h-full w-full object-cover
                "
                style={{
                  objectPosition:
                    `${coverPositionX}% ${coverPositionY}%`,
                }}
              />

              <div
                className="
                  pointer-events-none absolute inset-0
                  bg-gradient-to-t
                  from-black/60 via-transparent
                  to-black/10
                "
              />

              <div
                className="
                  pointer-events-none absolute
                  left-4 top-4 rounded-full
                  bg-black/70 px-3 py-1.5
                  text-xs font-semibold text-white
                  backdrop-blur-sm
                "
              >
                Giữ chuột và kéo để chỉnh vị trí
              </div>

              <div
                className="
                  pointer-events-none absolute
                  bottom-4 left-4
                  flex items-center gap-2
                "
              >
                <CheckCircle2
                  className="
                    h-5 w-5 text-emerald-400
                  "
                />

                <span className="text-sm font-bold text-white">
                  {coverFile
                    ? 'Đã chọn ảnh bìa mới'
                    : 'Đang dùng ảnh bìa hiện tại'}
                </span>
              </div>
            </div>

            <div
              className="
                flex flex-col gap-4 p-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">
                  {coverFile
                    ? coverFile.name
                    : 'Ảnh bìa hiện tại'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Vị trí: {coverPositionX.toFixed(1)}% ×{' '}
                  {coverPositionY.toFixed(1)}%
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={centerCover}
                  className="
                    inline-flex items-center gap-2
                    rounded-xl border
                    border-slate-600
                    bg-slate-800 px-3 py-2
                    text-sm font-semibold
                    text-slate-200 transition
                    hover:bg-slate-700
                  "
                >
                  <RotateCcw className="h-4 w-4" />
                  Căn giữa
                </button>

                <button
                  type="button"
                  onClick={() =>
                    coverInputRef.current?.click()
                  }
                  className="
                    inline-flex items-center gap-2
                    rounded-xl border
                    border-amber-400/20
                    bg-amber-400/10 px-3 py-2
                    text-sm font-semibold
                    text-amber-200 transition
                    hover:bg-amber-400/20
                  "
                >
                  <ImageIcon className="h-4 w-4" />
                  Thay ảnh
                </button>

                {coverFile && (
                  <button
                    type="button"
                    onClick={restoreCurrentCover}
                    className="
                      inline-flex items-center gap-2
                      rounded-xl border
                      border-red-400/20
                      bg-red-500/10 px-3 py-2
                      text-sm font-semibold
                      text-red-200 transition
                      hover:bg-red-500/20
                    "
                  >
                    <Trash2 className="h-4 w-4" />
                    Bỏ ảnh mới
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              coverInputRef.current?.click()
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
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
              mt-5 flex min-h-52 cursor-pointer
              flex-col items-center justify-center
              rounded-2xl border-2 border-dashed
              px-6 py-8 text-center transition
              ${
                coverDragging
                  ? 'border-amber-300 bg-amber-400/10'
                  : 'border-slate-700 bg-slate-900/70 hover:border-amber-400 hover:bg-slate-900'
              }
            `}
          >
            {coverDragging ? (
              <UploadCloud className="h-10 w-10 text-amber-400" />
            ) : (
              <ImageIcon className="h-10 w-10 text-amber-400" />
            )}

            <p className="mt-4 font-bold text-slate-100">
              {coverDragging
                ? 'Thả ảnh vào đây'
                : 'Chọn hoặc kéo ảnh bìa vào đây'}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              JPG, PNG hoặc WEBP · Tối đa 10 MB
            </p>
          </div>
        )}

        {coverError && (
          <p
            className="
              mt-3 rounded-xl bg-red-950/60
              px-4 py-3 text-sm text-red-300
            "
          >
            {coverError}
          </p>
        )}
      </section>

      {/* File mod */}
      <section
        className="
          rounded-2xl border border-white/10
          bg-slate-950/40 p-5
        "
      >
        <div>
          <h2 className="font-bold text-slate-100">
            File mod
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Nếu không chọn file mới, website sẽ giữ nguyên
            file hiện tại.
          </p>
        </div>

        <input
          ref={modInputRef}
          id="editModFile"
          name="file"
          type="file"
          className="hidden"
          onChange={handleModChange}
        />

        {!modFile ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              modInputRef.current?.click()
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
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
              mt-5 flex min-h-40 cursor-pointer
              flex-col items-center justify-center
              rounded-2xl border-2 border-dashed
              px-6 py-8 text-center transition
              ${
                modDragging
                  ? 'border-sky-300 bg-sky-400/10'
                  : 'border-slate-700 bg-slate-900/70 hover:border-sky-400 hover:bg-slate-900'
              }
            `}
          >
            {modDragging ? (
              <UploadCloud className="h-9 w-9 text-sky-400" />
            ) : (
              <Package className="h-9 w-9 text-sky-400" />
            )}

            <p className="mt-4 font-bold text-slate-100">
              {modDragging
                ? 'Thả file mod mới vào đây'
                : 'Chọn hoặc kéo file mod mới vào đây'}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              File hiện tại: {currentFileName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatFileSize(currentFileSize)}
            </p>
          </div>
        ) : (
          <div
            className="
              mt-5 flex flex-col gap-4
              rounded-2xl border
              border-sky-400/20
              bg-sky-400/5 p-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-xl bg-sky-400/10
                  text-sky-400
                "
              >
                <Package className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">
                  {modFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatFileSize(modFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={clearModFile}
              className="
                inline-flex items-center
                justify-center gap-2
                rounded-xl border
                border-red-400/20
                bg-red-500/10 px-3 py-2
                text-sm font-semibold
                text-red-200 transition
                hover:bg-red-500/20
              "
            >
              <Trash2 className="h-4 w-4" />
              Giữ file cũ
            </button>
          </div>
        )}

        {modError && (
          <p
            className="
              mt-3 rounded-xl bg-red-950/60
              px-4 py-3 text-sm text-red-300
            "
          >
            {modError}
          </p>
        )}
      </section>
    </div>
  );
}