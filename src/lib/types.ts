export type AvatarFrameTier =
  | 'MEMBER'
  | 'NHAN_KIET'
  | 'THIEN_KIEU'
  | 'THAN_THOAI';
export type Role = 'MEMBER' | 'MODDER' | 'ADMIN';
export type AccessLevel = 'PUBLIC' | 'MEMBER' | 'VIP';


export type CultivationRealmId =
  | 'LUYEN_KHI'
  | 'TRUC_CO'
  | 'KET_TINH'
  | 'KIM_DAN'
  | 'CU_LINH'
  | 'NGUYEN_ANH'
  | 'HOA_THAN'
  | 'NGO_DAO'
  | 'VU_HOA'
  | 'DANG_TIEN';

export type CultivationBreakthroughStatus =
  | 'CULTIVATING'
  | 'READY'
  | 'COMPLETED';

export interface CultivationProgress {
  realmId: CultivationRealmId;
  realmXp: number;
  breakthroughStatus: CultivationBreakthroughStatus;
  completedQuestIds: string[];
  updatedAt: string;
}

/**
 * Các liên kết mạng xã hội có thể hiển thị trên hồ sơ công khai.
 */
export interface UserSocialLinks {
  facebook?: string;
  youtube?: string;
  discord?: string;
  github?: string;
  steam?: string;
}

/**
 * Dữ liệu hồ sơ hiển thị công khai của người dùng.
 */
export interface UserProfile {
  /**
   * Tên hiển thị công khai trên trang cá nhân và trang tác giả.
   */
  displayName: string;

  /**
   * Đường dẫn ảnh đại diện trong thư mục public.
   * Ví dụ: /uploads/avatars/user-123.webp
   */
  avatar?: string;

  /**
   * Đường dẫn ảnh bìa hồ sơ trong thư mục public.
   * Ví dụ: /uploads/profile-covers/user-123.webp
   */
  coverImage?: string;

  /**
   * Vị trí ảnh bìa theo phần trăm.
   */
  coverPosition?: {
    x: number;
    y: number;
  };

  /** Giới thiệu ngắn về người dùng hoặc modder. */
  bio?: string;

  /** Khu vực hiển thị công khai, không phải địa chỉ chi tiết. */
  location?: string;

  /** Trang web cá nhân cá nhân hoặc trang dự án. */
  website?: string;

  /** Các liên kết mạng xã hội công khai. */
  socialLinks?: UserSocialLinks;
}

/**
 * Tài khoản người dùng lưu trong data/users.json.
 *
 * Các trường hồ sơ đang để tùy chọn để dữ liệu tài khoản cũ vẫn hoạt động
 * trước và trong quá trình migration.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isVip: boolean;
  avatarFrameTier?: AvatarFrameTier;
  cultivation?: CultivationProgress;

  /**
   * Slug dùng cho URL hồ sơ công khai.
   * Ví dụ: /authors/co-tieu-nguyet
   */
  profileSlug?: string;

  /** Hồ sơ hiển thị công khai. */
  profile?: UserProfile;

  createdAt: string;
  updatedAt?: string;

  /**
   * Không có trường này được hiểu là tài khoản vẫn hoạt động.
   */
  isActive?: boolean;

  /** Ngày email được xác thực. */
  emailVerifiedAt?: string;

  /** Chỉ tài khoản đăng ký mới dùng cờ này trong thời gian chờ xác thực. */
  emailVerificationRequired?: boolean;

  /** Chỉ lưu SHA-256 của token, không lưu token gốc. */
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: string;
}

/**
 * Dữ liệu an toàn để hiển thị công khai.
 * Không chứa email hoặc passwordHash.
 */
export interface PublicUserProfile {
  id: string;
  name: string;
  profileSlug: string;
  role: Role;
  isVip: boolean;
  avatarFrameTier?: AvatarFrameTier;
  cultivation?: CultivationProgress;
  profile: UserProfile;
  createdAt: string;
}

/**
 * Thống kê tác giả được tính động.
 */
export interface AuthorStats {
  publishedModCount: number;
  totalDownloads: number;
  totalReviews: number;
  totalComments: number;
  averageRating: number;
}

export interface ModItem {
  id: string;
  title: string;
  slug: string;
  game: string;
  category: string;
  version: string;
  gameVersion: string;

  /**
   * ID tài khoản đăng mod.
   * Tạm thời tùy chọn để tương thích mod cũ.
   */
  authorId?: string;

  /**
   * Tên tác giả kiểu cũ, tiếp tục giữ trong giai đoạn chuyển đổi.
   */
  author: string;

  description: string;
  installation: string;
  accessLevel: AccessLevel;

  fileName: string;
  storedFileName: string;
  fileSize: number;

  coverUrl: string;
  coverPositionX?: number;
  coverPositionY?: number;

  /**
   * Danh sách ảnh minh họa của mod.
   */
  galleryUrls?: string[];

  /** Thẻ khám phá và tìm kiếm của mod. */
  tags?: string[];

  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export type CommentModerationStatus =
  | 'VISIBLE'
  | 'HIDDEN'
  | 'DELETED';

export interface CommentItem {
  id: string;
  modId: string;

  /**
   * ID và tên hiển thị tại thời điểm viết luận bàn.
   */
  userId: string;
  userName: string;

  /**
   * ID luận bàn cha. Không có nghĩa là luận bàn cấp đầu.
   */
  parentId?: string;

  /**
   * Người được nhắc tới. Dùng để mở rộng Mention Notification sau này.
   */
  mentionedUserIds?: string[];

  content: string;

  /**
   * Trạng thái kiểm duyệt. Comment cũ không có trường này được xem là VISIBLE.
   */
  moderationStatus?: CommentModerationStatus;

  /**
   * Khóa reply cho riêng node này và toàn bộ nhánh bên dưới.
   */
  isLocked?: boolean;

  moderatedByUserId?: string;
  moderatedAt?: string;
  moderationReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ReviewItem {
  id: string;
  modId: string;

  /**
   * ID và tên hiển thị tại thời điểm viết luận đạo.
   */
  userId: string;
  userName: string;

  /** Điểm luận đạo từ 1 đến 5. */
  rating: 1 | 2 | 3 | 4 | 5;

  /**
   * Có thể để trống nếu người dùng chỉ chấm sao.
   */
  content: string;

  createdAt: string;
  updatedAt: string;
}

export interface ModFavorite {
  userId: string;
  modId: string;
  createdAt: string;
}

export type CollectionVisibility = 'PUBLIC' | 'PRIVATE';
export type CollectionModerationStatus = 'VISIBLE' | 'HIDDEN';

export interface ModCollection {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  visibility: CollectionVisibility;
  moderationStatus?: CollectionModerationStatus;
  moderatedByUserId?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  collectionId: string;
  modId: string;
  addedByUserId: string;
  createdAt: string;
}



export interface SearchAnalyticsItem {
  id: string;
  query: string;
  normalizedQuery: string;
  resultCount: number;
  userId?: string;
  createdAt: string;
}


export interface ModVersion {
  id: string;
  modId: string;
  version: string;
  gameVersion: string;
  changelog: string;
  fileName: string;
  storedFileName: string;
  fileSize: number;
  downloads: number;
  isCurrent: boolean;
  createdByUserId: string;
  createdAt: string;
}

export type ModDependencyType =
  | 'REQUIRED'
  | 'OPTIONAL';

export interface ModDependency {
  id: string;
  modId: string;
  dependencyModId?: string;
  externalName?: string;
  externalUrl?: string;
  type: ModDependencyType;
  note: string;
  sortOrder: number;
  createdAt: string;
}