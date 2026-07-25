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
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

type GalleryUploadFieldsProps = {
  initialUrls?: string[];
};

type ExistingPreviewItem = {
  id: string;
  kind: 'existing';
  url: string;
};

type NewPreviewItem = {
  id: string;
  kind: 'new';
  file: File;
  previewUrl: string;
};

type PreviewItem = ExistingPreviewItem | NewPreviewItem;

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

function createExistingItems(
  urls: string[],
): ExistingPreviewItem[] {
  return Array.from(new Set(urls.filter(Boolean)))
    .slice(0, MAX_GALLERY_IMAGES)
    .map((url, index) => ({
      id: `existing-${index}-${url}`,
      kind: 'existing' as const,
      url,
    }));
}

export default function GalleryUploadFields({
  initialUrls = [],
}: GalleryUploadFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const newItemsRef = useRef<NewPreviewItem[]>([]);

  const [existingItems, setExistingItems] = useState<
    ExistingPreviewItem[]
  >(() => createExistingItems(initialUrls));
  const [newItems, setNewItems] = useState<NewPreviewItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const items: PreviewItem[] = [
    ...existingItems,
    ...newItems,
  ];

  useEffect(() => {
    newItemsRef.current = newItems;
  }, [newItems]);

  useEffect(() => {
    return () => {
      newItemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  function validateFile(file: File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `${file.name}: chỉ hỗ trợ JPG, PNG hoặc WEBP.`;
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return `${file.name}: dung lượng không được vượt quá 2 MB.`;
    }

    return '';
  }

  function syncInputFiles(nextItems: NewPreviewItem[]): void {
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
        `Chỉ được lưu tối đa ${MAX_GALLERY_IMAGES} ảnh preview.`,
      );
      return;
    }

    const acceptedFiles: File[] = [];
    let latestError = '';

    for (const file of incomingFiles) {
      const validationError = validateFile(file);

      if (validationError) {
        latestError = validationError;
        continue;
      }

      const duplicated = newItems.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified,
      );

      if (!duplicated) {
        acceptedFiles.push(file);
      }
    }

    const filesToAdd = acceptedFiles.slice(
      0,
      availableSlots,
    );

    if (acceptedFiles.length > availableSlots) {
      latestError =
        `Đạo hữu chỉ có thể thêm ${availableSlots} ảnh nữa.`;
    }

    const addedItems: NewPreviewItem[] = filesToAdd.map(
      (file) => ({
        id: crypto.randomUUID(),
        kind: 'new',
        file,
        previewUrl: URL.createObjectURL(file),
      }),
    );

    const nextItems = [...newItems, ...addedItems];

    setNewItems(nextItems);
    syncInputFiles(nextItems);
    setError(latestError);
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

  function removeItem(item: PreviewItem): void {
    if (item.kind === 'existing') {
      setExistingItems((current) =>
        current.filter((entry) => entry.id !== item.id),
      );
    } else {
      URL.revokeObjectURL(item.previewUrl);

      const nextItems = newItems.filter(
        (entry) => entry.id !== item.id,
      );

      setNewItems(nextItems);
      syncInputFiles(nextItems);
    }

    setError('');
  }

  function clearAll(): void {
    newItems.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });

    setExistingItems([]);
    setNewItems([]);
    setError('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"
    >
      <input
        type="hidden"
        name="galleryUpdateIntent"
        value="1"
      />

      {existingItems.map((item) => (
        <input
          key={`keep-${item.id}`}
          type="hidden"
          name="existingGalleryUrls"
          value={item.url}
        />
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Images className="h-5 w-5 text-violet-400" />

            <h2 className="font-bold text-slate-100">
              Ảnh preview
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Giữ, xóa hoặc thêm tối đa {MAX_GALLERY_IMAGES}{' '}
            ảnh JPG, PNG hoặc WEBP. Mỗi ảnh không vượt quá 2 MB.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
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
          if (event.key === 'Enter' || event.key === ' ') {
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
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
          Đang lưu {items.length}/{MAX_GALLERY_IMAGES} ảnh
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const previewUrl =
              item.kind === 'existing'
                ? item.url
                : item.previewUrl;

            const title =
              item.kind === 'existing'
                ? 'Ảnh hiện có'
                : item.file.name;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
              >
                <div className="relative aspect-video bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Ảnh preview ${index + 1}`}
                    className="h-full w-full object-cover"
                  />

                  <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                    Ảnh {index + 1}
                  </span>

                  <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-100 backdrop-blur-sm">
                    {item.kind === 'existing' ? 'Hiện có' : 'Mới'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold text-slate-200"
                      title={title}
                    >
                      {title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.kind === 'existing'
                        ? 'Sẽ được giữ lại khi lưu'
                        : formatFileSize(item.file.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="shrink-0 rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                    aria-label={`Xóa ảnh preview ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
