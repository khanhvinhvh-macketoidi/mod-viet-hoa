'use client';

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Images,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';

const MAX_GALLERY_IMAGES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

type PreviewItem = {
  id: string;
  file: File;
  previewUrl: string;
};

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

export default function GalleryUploadFields() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PreviewItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  /**
   * Giải phóng các blob URL khi component bị gỡ.
   */
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [items]);

  function validateFile(file: File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `${file.name}: chỉ hỗ trợ JPG, PNG hoặc WEBP.`;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return `${file.name}: dung lượng vượt quá 10 MB.`;
    }

    return '';
  }

  /**
   * Đồng bộ danh sách file trong state vào input thật.
   * Nhờ vậy form HTML vẫn gửi được nhiều file đến API.
   */
  function syncInputFiles(nextItems: PreviewItem[]): void {
    if (!inputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();

    nextItems.forEach((item) => {
      dataTransfer.items.add(item.file);
    });

    inputRef.current.files = dataTransfer.files;
  }

  function addFiles(fileList: FileList | File[]): void {
    const incomingFiles = Array.from(fileList);

    if (incomingFiles.length === 0) {
      return;
    }

    const availableSlots =
      MAX_GALLERY_IMAGES - items.length;

    if (availableSlots <= 0) {
      setError(
        `Chỉ được tải tối đa ${MAX_GALLERY_IMAGES} ảnh preview.`,
      );

      return;
    }

    const acceptedFiles: File[] = [];

    for (const file of incomingFiles) {
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        continue;
      }

      /**
       * Chặn chọn trùng cùng file trong một lần đăng.
       */
      const duplicated = items.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified,
      );

      if (duplicated) {
        continue;
      }

      acceptedFiles.push(file);
    }

    const filesToAdd = acceptedFiles.slice(
      0,
      availableSlots,
    );

    if (acceptedFiles.length > availableSlots) {
      setError(
        `Đạo hữu chỉ có thể thêm ${availableSlots} ảnh nữa.`,
      );
    } else if (filesToAdd.length > 0) {
      setError('');
    }

    const newItems: PreviewItem[] = filesToAdd.map(
      (file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }),
    );

    const nextItems = [...items, ...newItems];

    setItems(nextItems);
    syncInputFiles(nextItems);
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const files = event.target.files;

    if (files) {
      addFiles(files);
    }
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
  ): void {
    event.preventDefault();
    setDragging(false);

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeItem(id: string): void {
    const removedItem = items.find(
      (item) => item.id === id,
    );

    if (removedItem) {
      URL.revokeObjectURL(removedItem.previewUrl);
    }

    const nextItems = items.filter(
      (item) => item.id !== id,
    );

    setItems(nextItems);
    syncInputFiles(nextItems);
    setError('');
  }

  function clearAll(): void {
    items.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });

    setItems([]);
    setError('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <section
      className="
        rounded-2xl border border-white/10
        bg-slate-950/40 p-5
      "
    >
      <div
        className="
          flex flex-col gap-3
          sm:flex-row sm:items-start sm:justify-between
        "
      >
        <div>
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-violet-400" />

            <h2 className="font-bold text-slate-100">
              Ảnh preview
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Tải tối đa {MAX_GALLERY_IMAGES} ảnh JPG, PNG
            hoặc WEBP. Mỗi ảnh không vượt quá 10 MB.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="
              inline-flex items-center gap-2
              self-start rounded-xl
              border border-red-400/20
              bg-red-500/10 px-3 py-2
              text-sm font-semibold text-red-200
              transition hover:bg-red-500/20
            "
          >
            <Trash2 className="h-4 w-4" />
            Xóa tất cả
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id="gallery"
        name="gallery"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={`
          mt-5 flex min-h-40 cursor-pointer
          flex-col items-center justify-center
          rounded-2xl border-2 border-dashed
          px-6 py-8 text-center transition
          ${
            dragging
              ? 'border-violet-300 bg-violet-400/10'
              : 'border-slate-700 bg-slate-900/70 hover:border-violet-400 hover:bg-slate-900'
          }
        `}
      >
        <div
          className="
            flex h-14 w-14 items-center
            justify-center rounded-2xl
            bg-violet-400/10 text-violet-400
          "
        >
          {dragging ? (
            <UploadCloud className="h-7 w-7" />
          ) : (
            <Plus className="h-7 w-7" />
          )}
        </div>

        <p className="mt-4 font-bold text-slate-100">
          {dragging
            ? 'Thả các ảnh vào đây'
            : 'Chọn hoặc kéo nhiều ảnh preview vào đây'}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Đã chọn {items.length}/{MAX_GALLERY_IMAGES} ảnh
        </p>
      </div>

      {error && (
        <p
          className="
            mt-4 rounded-xl
            border border-red-400/20
            bg-red-500/10 px-4 py-3
            text-sm text-red-200
          "
        >
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div
          className="
            mt-5 grid gap-4
            sm:grid-cols-2 lg:grid-cols-3
          "
        >
          {items.map((item, index) => (
            <article
              key={item.id}
              className="
                overflow-hidden rounded-2xl
                border border-white/10
                bg-slate-900
              "
            >
              <div className="relative aspect-video bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Ảnh preview ${index + 1}`}
                  className="h-full w-full object-cover"
                />

                <span
                  className="
                    absolute left-3 top-3
                    rounded-full bg-black/70
                    px-2.5 py-1 text-xs
                    font-bold text-white
                    backdrop-blur-sm
                  "
                >
                  Ảnh {index + 1}
                </span>
              </div>

              <div
                className="
                  flex items-center
                  justify-between gap-3 p-3
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      truncate text-sm
                      font-semibold text-slate-200
                    "
                    title={item.file.name}
                  >
                    {item.file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="
                    shrink-0 rounded-xl
                    border border-red-400/20
                    bg-red-500/10 p-2
                    text-red-300 transition
                    hover:bg-red-500/20
                  "
                  aria-label={`Xóa ${item.file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}