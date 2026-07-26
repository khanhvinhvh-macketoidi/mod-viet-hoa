import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { dataDir } from '@/lib/data-paths';
import {
  readJsonAtomic,
  writeJsonAtomic,
} from '@/lib/stability/atomic-json';

import type {
  ModErrorReport,
  ModErrorReportCategory,
  ModErrorReportImage,
  ModErrorReportStatus,
  PublicModErrorReport,
} from '@/lib/mod-error-report-types';

export type {
  ModErrorReport,
  ModErrorReportCategory,
  ModErrorReportImage,
  ModErrorReportStatus,
  PublicModErrorReport,
} from '@/lib/mod-error-report-types';

const reportsPath = path.join(dataDir, 'mod-error-reports.json');
const imagesRoot = path.resolve(
  process.cwd(),
  'storage',
  'mod-error-report-images',
);

const globalState = globalThis as typeof globalThis & {
  __modErrorReportMutation?: Promise<void>;
};

function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous =
    globalState.__modErrorReportMutation ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState.__modErrorReportMutation = previous.then(() => current);

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

function imageExtension(
  contentType: ModErrorReportImage['contentType'],
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

function imageUrl(reportId: string, imageId: string): string {
  return `/api/mod-error-reports/${encodeURIComponent(reportId)}/images/${encodeURIComponent(imageId)}`;
}

function publicReport(report: ModErrorReport): PublicModErrorReport {
  return {
    ...report,
    imageUrls: report.images.map((image) => imageUrl(report.id, image.id)),
  };
}

function resolveStoredImagePath(storedName: string): string | null {
  if (
    !/^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(storedName) ||
    path.basename(storedName) !== storedName
  ) {
    return null;
  }

  const resolved = path.resolve(imagesRoot, storedName);

  if (!resolved.startsWith(`${imagesRoot}${path.sep}`)) {
    return null;
  }

  return resolved;
}

export async function getModErrorReports(): Promise<ModErrorReport[]> {
  return readJsonAtomic<ModErrorReport[]>(reportsPath, []);
}

export async function getModErrorReportById(
  reportId: string,
): Promise<ModErrorReport | undefined> {
  return (await getModErrorReports()).find((report) => report.id === reportId);
}

export async function getAllPublicModErrorReports(): Promise<PublicModErrorReport[]> {
  return (await getModErrorReports())
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(publicReport);
}

export async function getVisibleModErrorReports(input: {
  modId: string;
  viewerUserId?: string;
  canManage: boolean;
}): Promise<PublicModErrorReport[]> {
  return (await getModErrorReports())
    .filter((report) => report.modId === input.modId)
    .filter(
      (report) =>
        input.canManage ||
        (input.viewerUserId && report.reporterUserId === input.viewerUserId),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(publicReport);
}

export async function createModErrorReport(input: {
  modId: string;
  modSlug: string;
  modTitle: string;
  reporterUserId: string;
  reporterName: string;
  version: unknown;
  category: unknown;
  title: unknown;
  description: unknown;
  reproductionSteps: unknown;
  environment?: unknown;
  imageFiles: File[];
}): Promise<PublicModErrorReport> {
  const version = cleanText(input.version, 60);
  const category = cleanText(input.category, 40) as ModErrorReportCategory;
  const title = cleanText(input.title, 140);
  const description = cleanText(input.description, 4_000);
  const reproductionSteps = cleanText(input.reproductionSteps, 3_000);
  const environment = cleanText(input.environment, 500) || undefined;
  const allowedCategories: ModErrorReportCategory[] = [
    'INSTALLATION',
    'CRASH',
    'TRANSLATION',
    'COMPATIBILITY',
    'MISSING_FILE',
    'OTHER',
  ];

  if (!version) throw new Error('Vui lòng nhập phiên bản mod gặp lỗi.');
  if (!allowedCategories.includes(category)) {
    throw new Error('Loại lỗi không hợp lệ.');
  }
  if (title.length < 5) {
    throw new Error('Tiêu đề báo lỗi cần có ít nhất 5 ký tự.');
  }
  if (description.length < 15) {
    throw new Error('Mô tả lỗi cần có ít nhất 15 ký tự.');
  }
  if (reproductionSteps.length < 5) {
    throw new Error('Vui lòng mô tả các bước tái hiện lỗi.');
  }
  if (input.imageFiles.length < 1 || input.imageFiles.length > 3) {
    throw new Error('Báo cáo lỗi phải có từ 1 đến 3 ảnh minh họa.');
  }

  return withMutationLock(async () => {
    const reports = await getModErrorReports();
    const recentCount = reports.filter(
      (report) =>
        report.reporterUserId === input.reporterUserId &&
        report.modId === input.modId &&
        Date.now() - new Date(report.createdAt).getTime() < 24 * 60 * 60 * 1000,
    ).length;

    if (recentCount >= 5) {
      throw new Error('Mỗi tài khoản chỉ có thể gửi tối đa 5 báo cáo cho một mod trong 24 giờ.');
    }

    const reportId = randomUUID();
    const writtenPaths: string[] = [];
    const images: ModErrorReportImage[] = [];

    await mkdir(imagesRoot, { recursive: true });

    try {
      for (const file of input.imageFiles) {
        const imageId = randomUUID();
        const contentType = file.type as ModErrorReportImage['contentType'];
        const storedName = `${imageId}${imageExtension(contentType)}`;
        const filePath = path.join(imagesRoot, storedName);

        await writeFile(
          filePath,
          Buffer.from(await file.arrayBuffer()),
          { flag: 'wx' },
        );
        writtenPaths.push(filePath);
        images.push({
          id: imageId,
          storedName,
          contentType,
          sizeBytes: file.size,
        });
      }

      const now = new Date().toISOString();
      const report: ModErrorReport = {
        id: reportId,
        modId: input.modId,
        modSlug: cleanText(input.modSlug, 160),
        modTitle: cleanText(input.modTitle, 200),
        reporterUserId: input.reporterUserId,
        reporterName: cleanText(input.reporterName, 100) || 'Đạo hữu',
        version,
        category,
        title,
        description,
        reproductionSteps,
        environment,
        images,
        status: 'NEW',
        createdAt: now,
        updatedAt: now,
      };

      reports.push(report);
      await writeJsonAtomic(reportsPath, reports);
      return publicReport(report);
    } catch (error) {
      await Promise.all(
        writtenPaths.map((filePath) => unlink(filePath).catch(() => undefined)),
      );
      throw error;
    }
  });
}

export async function updateModErrorReport(input: {
  reportId: string;
  status: ModErrorReportStatus;
  resolutionNote?: unknown;
  handledByUserId: string;
}): Promise<PublicModErrorReport> {
  const allowedStatuses: ModErrorReportStatus[] = [
    'NEW',
    'VERIFYING',
    'NEED_INFO',
    'FIXED',
    'REJECTED',
  ];

  if (!allowedStatuses.includes(input.status)) {
    throw new Error('Trạng thái báo cáo không hợp lệ.');
  }

  return withMutationLock(async () => {
    const reports = await getModErrorReports();
    const index = reports.findIndex((report) => report.id === input.reportId);

    if (index < 0) throw new Error('Không tìm thấy báo cáo lỗi.');

    reports[index] = {
      ...reports[index],
      status: input.status,
      resolutionNote: cleanText(input.resolutionNote, 1_000) || undefined,
      handledByUserId: input.handledByUserId,
      updatedAt: new Date().toISOString(),
    };

    await writeJsonAtomic(reportsPath, reports);
    return publicReport(reports[index]);
  });
}

export async function readModErrorReportImage(input: {
  reportId: string;
  imageId: string;
}): Promise<{
  report: ModErrorReport;
  image: ModErrorReportImage;
  body: Buffer;
} | null> {
  const report = await getModErrorReportById(input.reportId);
  const image = report?.images.find((item) => item.id === input.imageId);

  if (!report || !image) return null;

  const filePath = resolveStoredImagePath(image.storedName);
  if (!filePath) return null;

  try {
    return {
      report,
      image,
      body: await readFile(filePath),
    };
  } catch {
    return null;
  }
}
