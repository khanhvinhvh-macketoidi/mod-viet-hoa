import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from '@/lib/data-paths';
import { readJsonAtomic, writeJsonAtomic } from '@/lib/stability/atomic-json';

export type ModRequestStatus =
  | 'OPEN'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type ModRequestIllustration = {
  storedName: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
};

export type ModRequest = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  game: string;
  description: string;
  sourceUrl?: string;
  illustration?: ModRequestIllustration;
  status: ModRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type ModRequestVote = {
  requestId: string;
  userId: string;
  createdAt: string;
};

export type PublicModRequest = ModRequest & {
  illustrationUrl?: string;
  voteCount: number;
  viewerHasVoted: boolean;
};

const modRequestsPath = path.join(dataDir, 'mod-requests.json');
const modRequestVotesPath = path.join(
  dataDir,
  'mod-request-votes.json',
);
const modRequestImagesDir = path.resolve(
  process.cwd(),
  'storage',
  'mod-request-images',
);

const globalState = globalThis as typeof globalThis & {
  __modLibraryModRequestMutation?: Promise<void>;
};

function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous =
    globalState.__modLibraryModRequestMutation ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState.__modLibraryModRequestMutation = previous.then(
    () => current,
  );

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value: unknown): string | undefined {
  const text = cleanText(value, 500);
  if (!text) return undefined;

  try {
    const url = new URL(text);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function illustrationExtension(
  contentType: ModRequestIllustration['contentType'],
): string {
  switch (contentType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
  }
}

function illustrationUrl(requestId: string): string {
  return `/api/mod-requests/${encodeURIComponent(requestId)}/illustration`;
}

function resolveIllustrationPath(storedName: string): string | null {
  if (
    !/^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(storedName) ||
    path.basename(storedName) !== storedName
  ) {
    return null;
  }

  const filePath = path.resolve(modRequestImagesDir, storedName);

  if (!filePath.startsWith(`${modRequestImagesDir}${path.sep}`)) {
    return null;
  }

  return filePath;
}

export async function getModRequests(): Promise<ModRequest[]> {
  return readJsonAtomic<ModRequest[]>(modRequestsPath, []);
}

export async function getModRequestVotes(): Promise<ModRequestVote[]> {
  return readJsonAtomic<ModRequestVote[]>(modRequestVotesPath, []);
}

export async function getPublicModRequests(
  viewerUserId?: string,
): Promise<PublicModRequest[]> {
  const [requests, votes] = await Promise.all([
    getModRequests(),
    getModRequestVotes(),
  ]);

  return requests
    .slice()
    .sort((left, right) => {
      const leftVotes = votes.filter(
        (vote) => vote.requestId === left.id,
      ).length;
      const rightVotes = votes.filter(
        (vote) => vote.requestId === right.id,
      ).length;

      return (
        rightVotes - leftVotes ||
        right.createdAt.localeCompare(left.createdAt)
      );
    })
    .map((request) => {
      const requestVotes = votes.filter(
        (vote) => vote.requestId === request.id,
      );

      return {
        ...request,
        illustrationUrl: request.illustration
          ? illustrationUrl(request.id)
          : undefined,
        voteCount: requestVotes.length,
        viewerHasVoted: Boolean(
          viewerUserId &&
            requestVotes.some(
              (vote) => vote.userId === viewerUserId,
            ),
        ),
      };
    });
}

export async function createModRequest(input: {
  userId: string;
  userName: string;
  title: unknown;
  game: unknown;
  description: unknown;
  sourceUrl?: unknown;
  illustrationFile?: File | null;
}): Promise<ModRequest> {
  const title = cleanText(input.title, 120);
  const game = cleanText(input.game, 80);
  const description = cleanText(input.description, 2_000);
  const rawSourceUrl = cleanText(input.sourceUrl, 500);
  const sourceUrl = cleanUrl(input.sourceUrl);

  if (title.length < 3) {
    throw new Error('Tên yêu cầu cần có ít nhất 3 ký tự.');
  }

  if (game.length < 2) {
    throw new Error('Tên game cần có ít nhất 2 ký tự.');
  }

  if (description.length < 10) {
    throw new Error('Mô tả yêu cầu cần có ít nhất 10 ký tự.');
  }

  if (rawSourceUrl && !sourceUrl) {
    throw new Error('Liên kết tham khảo không hợp lệ.');
  }

  return withMutationLock(async () => {
    const requests = await getModRequests();
    const openCount = requests.filter(
      (request) =>
        request.userId === input.userId &&
        ['OPEN', 'PLANNED', 'IN_PROGRESS'].includes(request.status),
    ).length;

    if (openCount >= 5) {
      throw new Error(
        'Mỗi đạo hữu chỉ có thể duy trì tối đa 5 yêu cầu đang mở.',
      );
    }

    const now = new Date().toISOString();
    const requestId = randomUUID();
    const illustrationFile = input.illustrationFile;
    let illustration: ModRequestIllustration | undefined;
    let illustrationPath: string | undefined;

    if (illustrationFile && illustrationFile.size > 0) {
      const contentType =
        illustrationFile.type as ModRequestIllustration['contentType'];
      const storedName = `${requestId}${illustrationExtension(contentType)}`;
      illustrationPath = path.join(modRequestImagesDir, storedName);

      await mkdir(modRequestImagesDir, { recursive: true });
      await writeFile(
        illustrationPath,
        Buffer.from(await illustrationFile.arrayBuffer()),
        { flag: 'wx' },
      );

      illustration = {
        storedName,
        contentType,
        sizeBytes: illustrationFile.size,
      };
    }

    const created: ModRequest = {
      id: requestId,
      userId: input.userId,
      userName: cleanText(input.userName, 100) || 'Đạo hữu',
      title,
      game,
      description,
      sourceUrl,
      illustration,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    requests.push(created);

    try {
      await writeJsonAtomic(modRequestsPath, requests);
      return created;
    } catch (error) {
      if (illustrationPath) {
        await unlink(illustrationPath).catch(() => undefined);
      }

      throw error;
    }
  });
}

export async function toggleModRequestVote(input: {
  requestId: string;
  userId: string;
}): Promise<{ voted: boolean; voteCount: number }> {
  return withMutationLock(async () => {
    const [requests, votes] = await Promise.all([
      getModRequests(),
      getModRequestVotes(),
    ]);
    const request = requests.find(
      (item) => item.id === input.requestId,
    );

    if (!request || request.status === 'CANCELLED') {
      throw new Error('Yêu cầu mod không còn tồn tại.');
    }

    const index = votes.findIndex(
      (vote) =>
        vote.requestId === input.requestId &&
        vote.userId === input.userId,
    );

    let voted = false;

    if (index >= 0) {
      votes.splice(index, 1);
    } else {
      votes.push({
        requestId: input.requestId,
        userId: input.userId,
        createdAt: new Date().toISOString(),
      });
      voted = true;
    }

    await writeJsonAtomic(modRequestVotesPath, votes);

    return {
      voted,
      voteCount: votes.filter(
        (vote) => vote.requestId === input.requestId,
      ).length,
    };
  });
}

export async function cancelModRequest(input: {
  requestId: string;
  userId: string;
  isAdmin: boolean;
}): Promise<ModRequest> {
  return withMutationLock(async () => {
    const requests = await getModRequests();
    const index = requests.findIndex(
      (item) => item.id === input.requestId,
    );

    if (index < 0) {
      throw new Error('Không tìm thấy yêu cầu mod.');
    }

    const request = requests[index];

    if (!input.isAdmin && request.userId !== input.userId) {
      throw new Error('Đạo hữu không có quyền hủy yêu cầu này.');
    }

    if (!input.isAdmin && request.status !== 'OPEN') {
      throw new Error(
        'Chỉ có thể hủy yêu cầu khi đang ở trạng thái tiếp nhận.',
      );
    }

    requests[index] = {
      ...request,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    };

    await writeJsonAtomic(modRequestsPath, requests);
    return requests[index];
  });
}

export async function updateModRequestStatus(input: {
  requestId: string;
  status: ModRequestStatus;
}): Promise<ModRequest> {
  const allowed: ModRequestStatus[] = [
    'OPEN',
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED',
    'CANCELLED',
  ];

  if (!allowed.includes(input.status)) {
    throw new Error('Trạng thái yêu cầu không hợp lệ.');
  }

  return withMutationLock(async () => {
    const requests = await getModRequests();
    const index = requests.findIndex(
      (item) => item.id === input.requestId,
    );

    if (index < 0) {
      throw new Error('Không tìm thấy yêu cầu mod.');
    }

    requests[index] = {
      ...requests[index],
      status: input.status,
      updatedAt: new Date().toISOString(),
    };

    await writeJsonAtomic(modRequestsPath, requests);
    return requests[index];
  });
}

export async function getModRequestIllustration(
  requestId: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const requests = await getModRequests();
  const request = requests.find((item) => item.id === requestId);
  const illustration = request?.illustration;

  if (!illustration) {
    return null;
  }

  const filePath = resolveIllustrationPath(illustration.storedName);

  if (!filePath) {
    return null;
  }

  try {
    return {
      data: await readFile(filePath),
      contentType: illustration.contentType,
    };
  } catch {
    return null;
  }
}
