export type ModErrorReportStatus =
  | 'NEW'
  | 'VERIFYING'
  | 'NEED_INFO'
  | 'FIXED'
  | 'REJECTED';

export type ModErrorReportCategory =
  | 'INSTALLATION'
  | 'CRASH'
  | 'TRANSLATION'
  | 'COMPATIBILITY'
  | 'MISSING_FILE'
  | 'OTHER';

export type ModErrorReportImage = {
  id: string;
  storedName: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
};

export type ModErrorReport = {
  id: string;
  modId: string;
  modSlug: string;
  modTitle: string;
  reporterUserId: string;
  reporterName: string;
  version: string;
  category: ModErrorReportCategory;
  title: string;
  description: string;
  reproductionSteps: string;
  environment?: string;
  images: ModErrorReportImage[];
  status: ModErrorReportStatus;
  resolutionNote?: string;
  handledByUserId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicModErrorReport = ModErrorReport & {
  imageUrls: string[];
};

export const MOD_ERROR_REPORT_STATUS_LABELS: Record<
  ModErrorReportStatus,
  string
> = {
  NEW: 'Mới',
  VERIFYING: 'Đang xác minh',
  NEED_INFO: 'Cần thêm thông tin',
  FIXED: 'Đã sửa',
  REJECTED: 'Từ chối',
};
