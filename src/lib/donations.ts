import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { dataDir, usersPath } from '@/lib/data-paths';
import { readJsonAtomic, writeJsonAtomic } from '@/lib/stability/atomic-json';
import { getUsers } from '@/lib/users';
import { normalizeUsers } from '@/lib/profile-utils';
import { announceIdentityPromotion } from '@/lib/achievement-announcement-service';
import type { AvatarFrameTier, User } from '@/lib/types';

export type DonationTransactionStatus =
  | 'PROCESSING'
  | 'MATCHED'
  | 'UNMATCHED'
  | 'IGNORED'
  | 'PENDING_AUTOMATION';

export type DonationToken = {
  id: string;
  userId: string;

  /**
   * Mã định danh kiểu cũ. Tiếp tục giữ để không phá dữ liệu production
   * và các giao dịch được tạo trước khi SePay giới hạn hậu tố 10 ký tự.
   */
  token: string;
  normalizedToken: string;

  /**
   * Mã thanh toán SePay hiện hành: tiền tố 2-5 chữ cái + đúng 10 ký tự
   * chữ/số viết hoa. Được bổ sung tự động cho record cũ khi user mở /support.
   */
  sepayCode?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DonationTransaction = {
  id: string;
  provider: 'SEPAY';
  providerTransactionId: string;
  uniqueKey: string;
  gateway: string;
  accountNumber: string;
  subAccount?: string;
  code?: string;
  content: string;
  description?: string;
  transferType: string;
  amount: number;
  accumulated?: number;
  referenceCode?: string;
  transactionDate: string;
  userId?: string;
  token?: string;
  status: DonationTransactionStatus;
  createdAt: string;
  processedAt?: string;
  note?: string;
};

export type SepayWebhookPayload = {
  id: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string | null;
  code?: string | null;
  content?: string | null;
  transferType?: string;
  description?: string | null;
  transferAmount?: number | string;
  accumulated?: number | string;
  referenceCode?: string | null;
};

export type DonationSummary = {
  totalAmount: number;
  transactionCount: number;
  largestAmount: number;
  latestProcessedAt?: string;
  currentTier: AvatarFrameTier;
};

export type DonationMonthlyStats = {
  monthKey: string;
  incomingCount: number;
  matchedCount: number;
  unmatchedCount: number;
  freeLimit: number;
};

export type SupportAccountConfig = {
  bankName: string;
  bankCode: string;
  bankBin: string;
  bankAccount: string;
  bankHolder: string;
  transferPrefix: string;
  messengerUrl: string;
  zaloUrl: string;
};

const donationTokensPath = path.join(dataDir, 'donation-tokens.json');
const donationTransactionsPath = path.join(
  dataDir,
  'donation-transactions.json',
);

const SEPAY_CODE_SUFFIX_LENGTH = 10;
const SEPAY_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const globalState = globalThis as typeof globalThis & {
  __modLibraryDonationMutation?: Promise<void>;
};

function withDonationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous =
    globalState.__modLibraryDonationMutation ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState.__modLibraryDonationMutation = previous.then(() => current);

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

function cleanPublicValue(
  value: string | undefined,
  fallback: string,
): string {
  return value?.trim() || fallback;
}

function normalizeTransferPrefix(value: string | undefined): string {
  const normalized = (value ?? '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 5);

  return normalized.length >= 2 ? normalized : 'MVH';
}

export function getSupportAccountConfig(): SupportAccountConfig {
  return {
    bankName: cleanPublicValue(
      process.env.SUPPORT_BANK_NAME,
      'Sacombank',
    ),
    bankCode: cleanPublicValue(
      process.env.SUPPORT_BANK_CODE,
      'STB',
    ),
    bankBin: cleanPublicValue(
      process.env.SUPPORT_BANK_BIN,
      '970403',
    ),
    bankAccount: cleanPublicValue(
      process.env.SUPPORT_BANK_ACCOUNT,
      '069419031992',
    ),
    bankHolder: cleanPublicValue(
      process.env.SUPPORT_BANK_HOLDER,
      'VO HO KHANH VINH',
    ),
    transferPrefix: normalizeTransferPrefix(
      process.env.SUPPORT_TRANSFER_PREFIX,
    ),
    messengerUrl: cleanPublicValue(
      process.env.NEXT_PUBLIC_SUPPORT_MESSENGER_URL,
      'https://m.me/kensee1903',
    ),
    zaloUrl: cleanPublicValue(
      process.env.NEXT_PUBLIC_SUPPORT_ZALO_URL,
      'https://zalo.me/0866850392',
    ),
  };
}

export function normalizeDonationCode(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function randomSepaySuffix(): string {
  const random = randomBytes(SEPAY_CODE_SUFFIX_LENGTH);
  let suffix = '';

  for (const byte of random) {
    suffix +=
      SEPAY_CODE_ALPHABET[
        byte % SEPAY_CODE_ALPHABET.length
      ];
  }

  return suffix;
}

function buildSepayCode(prefix: string): string {
  return `${prefix}${randomSepaySuffix()}`;
}

function validSepayCode(
  value: string | undefined,
  prefix: string,
): string | undefined {
  const normalized = normalizeDonationCode(value ?? '');
  const pattern = new RegExp(
    `^${prefix}[A-Z0-9]{${SEPAY_CODE_SUFFIX_LENGTH}}$`,
  );

  return pattern.test(normalized) ? normalized : undefined;
}

function currentSepayCode(
  token: DonationToken,
  prefix: string,
): string | undefined {
  return (
    validSepayCode(token.sepayCode, prefix) ??
    validSepayCode(token.normalizedToken, prefix) ??
    validSepayCode(token.token, prefix)
  );
}

export async function getDonationTokens(): Promise<DonationToken[]> {
  return readJsonAtomic<DonationToken[]>(donationTokensPath, []);
}

export async function getDonationTransactions(): Promise<
  DonationTransaction[]
> {
  return readJsonAtomic<DonationTransaction[]>(
    donationTransactionsPath,
    [],
  );
}

export async function getOrCreateDonationToken(
  userId: string,
): Promise<DonationToken> {
  return withDonationLock(async () => {
    const tokens = await getDonationTokens();
    const config = getSupportAccountConfig();
    const existingIndex = tokens.findIndex(
      (item) => item.userId === userId,
    );

    if (existingIndex >= 0) {
      const existing = tokens[existingIndex];
      const existingSepayCode = currentSepayCode(
        existing,
        config.transferPrefix,
      );

      if (existingSepayCode) {
        if (existing.sepayCode === existingSepayCode) {
          return existing;
        }

        const migrated = {
          ...existing,
          sepayCode: existingSepayCode,
          updatedAt: new Date().toISOString(),
        };

        tokens[existingIndex] = migrated;
        await writeJsonAtomic(donationTokensPath, tokens);
        return migrated;
      }

      let sepayCode = '';

      do {
        sepayCode = buildSepayCode(config.transferPrefix);
      } while (
        tokens.some(
          (item) =>
            currentSepayCode(item, config.transferPrefix) ===
            sepayCode,
        )
      );

      const migrated = {
        ...existing,
        sepayCode,
        updatedAt: new Date().toISOString(),
      };

      tokens[existingIndex] = migrated;
      await writeJsonAtomic(donationTokensPath, tokens);
      return migrated;
    }

    let sepayCode = '';

    do {
      sepayCode = buildSepayCode(config.transferPrefix);
    } while (
      tokens.some(
        (item) =>
          currentSepayCode(item, config.transferPrefix) ===
          sepayCode,
      )
    );

    const now = new Date().toISOString();
    const created: DonationToken = {
      id: randomUUID(),
      userId,
      token: sepayCode,
      normalizedToken: sepayCode,
      sepayCode,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    tokens.push(created);
    await writeJsonAtomic(donationTokensPath, tokens);
    return created;
  });
}

export function getDonationTransferCode(
  token: DonationToken,
): string {
  const config = getSupportAccountConfig();

  return (
    currentSepayCode(token, config.transferPrefix) ??
    token.normalizedToken
  );
}

function tierIndex(tier: AvatarFrameTier): number {
  return ['MEMBER', 'NHAN_KIET', 'THIEN_KIEU', 'THAN_THOAI'].indexOf(
    tier,
  );
}

function maxTier(
  left: AvatarFrameTier,
  right: AvatarFrameTier,
): AvatarFrameTier {
  return tierIndex(left) >= tierIndex(right) ? left : right;
}

function tierForDonation(
  totalAmount: number,
  latestAmount: number,
): AvatarFrameTier {
  if (latestAmount >= 100_000 || totalAmount >= 100_000) {
    return 'THIEN_KIEU';
  }

  if (totalAmount > 0) {
    return 'NHAN_KIET';
  }

  return 'MEMBER';
}

function normalizeAmount(value: number | string | undefined): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function normalizeAccount(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function findMatchingToken(
  tokens: DonationToken[],
  payload: SepayWebhookPayload,
): DonationToken | undefined {
  const config = getSupportAccountConfig();
  const activeTokens = tokens.filter(
    (item) => item.active !== false,
  );
  const payloadCode = normalizeDonationCode(
    payload.code ?? '',
  );

  if (payloadCode) {
    const directMatch = activeTokens.find(
      (item) =>
        currentSepayCode(item, config.transferPrefix) ===
        payloadCode,
    );

    if (directMatch) return directMatch;
  }

  const searchSpace = normalizeDonationCode(
    `${payload.content ?? ''} ${payload.description ?? ''}`,
  );

  if (!searchSpace) return undefined;

  return activeTokens.find((item) => {
    const candidates = [
      currentSepayCode(item, config.transferPrefix),
      normalizeDonationCode(item.normalizedToken),
      normalizeDonationCode(item.token),
    ].filter(
      (value): value is string =>
        Boolean(value && value.length >= 10),
    );

    return candidates.some((candidate) =>
      searchSpace.includes(candidate),
    );
  });
}

function monthKeyFor(value: string | undefined): string {
  const date = value ? new Date(value.replace(' ', 'T')) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 7);
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

export async function getDonationSummary(
  user: Pick<User, 'id' | 'avatarFrameTier'>,
): Promise<DonationSummary> {
  const transactions = await getDonationTransactions();
  const matched = transactions.filter(
    (item) => item.userId === user.id && item.status === 'MATCHED',
  );

  return {
    totalAmount: matched.reduce((sum, item) => sum + item.amount, 0),
    transactionCount: matched.length,
    largestAmount: matched.reduce(
      (largest, item) => Math.max(largest, item.amount),
      0,
    ),
    latestProcessedAt: matched
      .map((item) => item.processedAt ?? item.createdAt)
      .sort()
      .at(-1),
    currentTier: user.avatarFrameTier ?? 'MEMBER',
  };
}

export async function getDonationMonthlyStats(
  date = new Date(),
): Promise<DonationMonthlyStats> {
  const monthKey = monthKeyFor(date.toISOString());
  const transactions = await getDonationTransactions();
  const incoming = transactions.filter(
    (item) =>
      item.transferType.toLowerCase() === 'in' &&
      monthKeyFor(item.transactionDate || item.createdAt) === monthKey,
  );

  return {
    monthKey,
    incomingCount: incoming.length,
    matchedCount: incoming.filter((item) => item.status === 'MATCHED')
      .length,
    unmatchedCount: incoming.filter(
      (item) =>
        item.status === 'UNMATCHED' ||
        item.status === 'PENDING_AUTOMATION',
    ).length,
    freeLimit: Math.max(
      1,
      Number(process.env.SEPAY_MONTHLY_FREE_LIMIT || 50) || 50,
    ),
  };
}

export function buildDonationQrUrl(input: {
  transferCode?: string;
  amount?: number;
}): string {
  const config = getSupportAccountConfig();
  const parameters = new URLSearchParams({
    acc: config.bankAccount,
    bank: config.bankBin || config.bankCode,
    template: 'compact',
    showinfo: 'true',
    fullacc: 'true',
    holder: config.bankHolder,
    store: 'MOD VIET HOA',
  });

  if (input.transferCode?.trim()) {
    parameters.set(
      'des',
      normalizeDonationCode(input.transferCode),
    );
  }

  if (input.amount && input.amount > 0) {
    parameters.set('amount', String(Math.round(input.amount)));
  }

  return `https://vietqr.app/img?${parameters.toString()}`;
}

async function promoteDonationIdentity(input: {
  userId: string;
  latestAmount: number;
  totalAmount: number;
}): Promise<{
  previousTier: AvatarFrameTier;
  currentTier: AvatarFrameTier;
  promoted: boolean;
}> {
  const users = await getUsers();
  const index = users.findIndex((item) => item.id === input.userId);

  if (index < 0) {
    throw new Error('Không tìm thấy tài khoản nhận đóng góp.');
  }

  const previousTier = users[index].avatarFrameTier ?? 'MEMBER';
  const targetTier = tierForDonation(
    input.totalAmount,
    input.latestAmount,
  );
  const currentTier = maxTier(previousTier, targetTier);
  const promoted = tierIndex(currentTier) > tierIndex(previousTier);

  if (promoted) {
    users[index] = {
      ...users[index],
      avatarFrameTier: currentTier,
      updatedAt: new Date().toISOString(),
    };

    await writeJsonAtomic(usersPath, normalizeUsers(users));
  }

  return {
    previousTier,
    currentTier,
    promoted,
  };
}

export async function processSepayWebhook(
  payload: SepayWebhookPayload,
  options: { automationEnabled: boolean },
): Promise<{
  test: boolean;
  duplicate: boolean;
  status: DonationTransactionStatus;
  promoted: boolean;
}> {
  const providerTransactionId = String(payload.id ?? '').trim();

  if (!providerTransactionId) {
    throw new Error('Webhook SePay thiếu mã giao dịch.');
  }

  if (providerTransactionId === '0') {
    return {
      test: true,
      duplicate: false,
      status: 'IGNORED',
      promoted: false,
    };
  }

  let announcement:
    | {
        userId: string;
        previousTier: AvatarFrameTier;
        currentTier: AvatarFrameTier;
        triggerId: string;
      }
    | undefined;

  const result = await withDonationLock(async () => {
    const transactions = await getDonationTransactions();
    const uniqueKey = `sepay:${providerTransactionId}`;
    const existingIndex = transactions.findIndex(
      (item) => item.uniqueKey === uniqueKey,
    );

    if (
      existingIndex >= 0 &&
      transactions[existingIndex].status !== 'PROCESSING'
    ) {
      return {
        test: false,
        duplicate: true,
        status: transactions[existingIndex].status,
        promoted: false,
      };
    }

    const config = getSupportAccountConfig();
    const amount = normalizeAmount(payload.transferAmount);
    const transferType = String(payload.transferType ?? '').toLowerCase();
    const accountNumber = String(payload.accountNumber ?? '').trim();
    const now = new Date().toISOString();

    let transaction: DonationTransaction;

    if (existingIndex >= 0) {
      transaction = transactions[existingIndex];
    } else {
      transaction = {
        id: randomUUID(),
        provider: 'SEPAY',
        providerTransactionId,
        uniqueKey,
        gateway: String(payload.gateway ?? ''),
        accountNumber,
        subAccount: payload.subAccount ?? undefined,
        code: payload.code ?? undefined,
        content: String(payload.content ?? ''),
        description: payload.description ?? undefined,
        transferType,
        amount,
        accumulated: normalizeAmount(payload.accumulated) || undefined,
        referenceCode: payload.referenceCode ?? undefined,
        transactionDate: String(payload.transactionDate ?? now),
        status: 'PROCESSING',
        createdAt: now,
      };

      transactions.push(transaction);
      await writeJsonAtomic(donationTransactionsPath, transactions);
    }

    if (
      transferType !== 'in' ||
      amount <= 0 ||
      normalizeAccount(accountNumber) !==
        normalizeAccount(config.bankAccount)
    ) {
      transaction.status = 'IGNORED';
      transaction.processedAt = now;
      transaction.note =
        transferType !== 'in'
          ? 'Không phải giao dịch tiền vào.'
          : amount <= 0
            ? 'Số tiền không hợp lệ.'
            : 'Không khớp tài khoản nhận đã cấu hình.';

      await writeJsonAtomic(donationTransactionsPath, transactions);
      return {
        test: false,
        duplicate: false,
        status: transaction.status,
        promoted: false,
      };
    }

    if (!options.automationEnabled) {
      transaction.status = 'PENDING_AUTOMATION';
      transaction.processedAt = now;
      transaction.note =
        'Tự động đối soát đang tắt; cần quản trị viên kiểm tra.';

      await writeJsonAtomic(donationTransactionsPath, transactions);
      return {
        test: false,
        duplicate: false,
        status: transaction.status,
        promoted: false,
      };
    }

    const tokens = await getDonationTokens();
    const matchedToken =
      transaction.token && transaction.userId
        ? tokens.find(
            (item) =>
              getDonationTransferCode(item) ===
                transaction.token &&
              item.userId === transaction.userId,
          )
        : findMatchingToken(tokens, payload);

    if (!matchedToken) {
      transaction.status = 'UNMATCHED';
      transaction.processedAt = now;
      transaction.note =
        'Không tìm thấy mã ủng hộ hợp lệ trong nội dung giao dịch.';

      await writeJsonAtomic(donationTransactionsPath, transactions);
      return {
        test: false,
        duplicate: false,
        status: transaction.status,
        promoted: false,
      };
    }

    transaction.userId = matchedToken.userId;
    transaction.token = getDonationTransferCode(matchedToken);
    transaction.status = 'PROCESSING';
    transaction.note = undefined;

    const totalAmount = transactions
      .filter(
        (item) =>
          item.userId === matchedToken.userId &&
          (item.status === 'MATCHED' || item.status === 'PROCESSING'),
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const promotion = await promoteDonationIdentity({
      userId: matchedToken.userId,
      latestAmount: amount,
      totalAmount,
    });

    transaction.status = 'MATCHED';
    transaction.processedAt = now;
    await writeJsonAtomic(donationTransactionsPath, transactions);

    if (promotion.promoted) {
      announcement = {
        userId: matchedToken.userId,
        previousTier: promotion.previousTier,
        currentTier: promotion.currentTier,
        triggerId: `donation:${providerTransactionId}`,
      };
    }

    return {
      test: false,
      duplicate: false,
      status: transaction.status,
      promoted: promotion.promoted,
    };
  });

  if (announcement) {
    try {
      await announceIdentityPromotion(announcement);
    } catch (error) {
      console.error(
        'Đã ghi nhận ủng hộ nhưng không thể tạo popup Thân phận:',
        error,
      );
    }
  }

  return result;
}

export async function getDonationAdminOverview(): Promise<{
  transactions: DonationTransaction[];
  monthly: DonationMonthlyStats;
}> {
  const [transactions, monthly] = await Promise.all([
    getDonationTransactions(),
    getDonationMonthlyStats(),
  ]);

  return {
    transactions: transactions
      .slice()
      .sort((left, right) =>
        (right.transactionDate || right.createdAt).localeCompare(
          left.transactionDate || left.createdAt,
        ),
      ),
    monthly,
  };
}
