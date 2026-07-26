import { MAX_MOD_FILE_BYTES } from '@/lib/upload-limits';

type UploadApiResult = {
  ok?: boolean;
  message?: string;
  requestId?: string;
  sessionId?: string;
  chunkSize?: number;
  receivedBytes?: number;
  totalBytes?: number;
};

export type ChunkedFileUploadProgress = {
  receivedBytes: number;
  totalBytes: number;
};

type UploadFileInChunksOptions = {
  signal: AbortSignal;
  onProgress?: (progress: ChunkedFileUploadProgress) => void;
};

const MAX_RETRIES_PER_CHUNK = 3;
const METADATA_NETWORK_RETRY_DELAYS_MS = [900, 1_800];
const ALLOWED_ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z'];

class NetworkRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkRequestError';
  }
}

function isNetworkRequestError(error: unknown): error is NetworkRequestError {
  return error instanceof Error && error.name === 'NetworkRequestError';
}

async function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);

    function handleAbort(): void {
      window.clearTimeout(timeoutId);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

async function readApiResult(response: Response): Promise<UploadApiResult> {
  const bodyText = await response.text();
  const trimmed = bodyText.trim();
  const contentType = response.headers.get('content-type') ?? '';

  if (!trimmed) {
    if (response.ok) return { ok: true };
    throw new Error(`Máy chủ trả về lỗi HTTP ${response.status}.`);
  }

  const looksLikeJson =
    contentType.includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (looksLikeJson) {
    try {
      return JSON.parse(trimmed) as UploadApiResult;
    } catch {
      throw new Error(
        `Máy chủ trả về JSON không hợp lệ (HTTP ${response.status}).`,
      );
    }
  }

  if (response.status === 413) {
    throw new Error(
      'Cloudflare hoặc proxy đã từ chối dung lượng request. Hãy tải lại trang để dùng trình tải theo từng phần.',
    );
  }

  if (/<!doctype html|<html/i.test(trimmed)) {
    throw new Error(
      `Máy chủ trung gian trả về trang lỗi HTML (HTTP ${response.status}). Vui lòng kiểm tra PM2/Cloudflare.`,
    );
  }

  throw new Error(`Máy chủ trả về lỗi HTTP ${response.status}.`);
}

async function requestJson(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<UploadApiResult> {
  let response: Response;

  try {
    response = await fetch(input, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    });
  } catch (error) {
    if (init.signal?.aborted) {
      throw error;
    }

    throw new NetworkRequestError(
      'Mất kết nối khi chờ máy chủ phản hồi.',
    );
  }

  const result = await readApiResult(response);

  if (!response.ok || result.ok === false) {
    const requestSuffix = result.requestId
      ? ` (mã ${result.requestId})`
      : '';

    throw new Error(
      `${result.message || 'Yêu cầu tải lên thất bại.'}${requestSuffix}`,
    );
  }

  return result;
}

function validateClientFile(file: File): void {
  if (file.size <= 0) {
    throw new Error('Vui lòng chọn file mod.');
  }

  if (file.size > MAX_MOD_FILE_BYTES) {
    throw new Error('File mod không được vượt quá 500 MB.');
  }

  const lowerName = file.name.toLowerCase();

  if (
    !ALLOWED_ARCHIVE_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension),
    )
  ) {
    throw new Error('File mod phải có định dạng ZIP, RAR hoặc 7Z.');
  }
}

async function uploadChunkWithRetry(input: {
  sessionId: string;
  file: File;
  offset: number;
  chunkSize: number;
  signal: AbortSignal;
}): Promise<number> {
  const end = Math.min(input.offset + input.chunkSize, input.file.size);
  const chunk = input.file.slice(input.offset, end);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt += 1) {
    try {
      const result = await requestJson(
        `/api/mod-upload/sessions/${input.sessionId}/chunk`,
        {
          method: 'PUT',
          body: chunk,
          signal: input.signal,
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Upload-Offset': String(input.offset),
          },
        },
      );

      const receivedBytes = Number(result.receivedBytes);

      if (!Number.isSafeInteger(receivedBytes) || receivedBytes < end) {
        throw new Error('Máy chủ trả về tiến độ tải lên không hợp lệ.');
      }

      return receivedBytes;
    } catch (error) {
      lastError = error;

      if (input.signal.aborted || attempt === MAX_RETRIES_PER_CHUNK) {
        break;
      }

      await wait(attempt * 700, input.signal);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể tải chunk lên máy chủ.');
}

export async function cancelChunkedUploadSession(
  sessionId: string,
): Promise<void> {
  if (!sessionId) return;

  await fetch(`/api/mod-upload/sessions/${sessionId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  }).catch(() => undefined);
}

export async function uploadFileInChunks(
  file: File,
  options: UploadFileInChunksOptions,
): Promise<{ sessionId: string }> {
  validateClientFile(file);

  let sessionId = '';

  try {
    const started = await requestJson('/api/mod-upload/sessions', {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
      }),
    });

    sessionId = String(started.sessionId ?? '');
    const chunkSize = Number(started.chunkSize);
    let offset = Number(started.receivedBytes ?? 0);

    if (
      !sessionId ||
      !Number.isSafeInteger(chunkSize) ||
      chunkSize <= 0 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > file.size
    ) {
      throw new Error('Máy chủ không tạo được phiên tải lên hợp lệ.');
    }

    options.onProgress?.({
      receivedBytes: offset,
      totalBytes: file.size,
    });

    while (offset < file.size) {
      offset = await uploadChunkWithRetry({
        sessionId,
        file,
        offset,
        chunkSize,
        signal: options.signal,
      });

      options.onProgress?.({
        receivedBytes: offset,
        totalBytes: file.size,
      });
    }

    await requestJson(`/api/mod-upload/sessions/${sessionId}/complete`, {
      method: 'POST',
      signal: options.signal,
    });

    return { sessionId };
  } catch (error) {
    await cancelChunkedUploadSession(sessionId);
    throw error;
  }
}

export async function submitChunkedUploadMetadata(
  url: string,
  formData: FormData,
  signal: AbortSignal,
): Promise<UploadApiResult> {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= METADATA_NETWORK_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      return await requestJson(url, {
        method: 'POST',
        signal,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formData,
      });
    } catch (error) {
      lastError = error;

      if (
        signal.aborted ||
        !isNetworkRequestError(error) ||
        attempt >= METADATA_NETWORK_RETRY_DELAYS_MS.length
      ) {
        break;
      }

      await wait(
        METADATA_NETWORK_RETRY_DELAYS_MS[attempt] ?? 1_800,
        signal,
      );
    }
  }

  if (isNetworkRequestError(lastError)) {
    throw new Error(
      'Không nhận được phản hồi từ máy chủ sau nhiều lần thử. Vui lòng kiểm tra PM2/Cloudflare rồi thử lại; mã đăng mod hiện tại vẫn được giữ để tránh tạo bản trùng.',
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Không thể lưu thông tin mod.');
}
