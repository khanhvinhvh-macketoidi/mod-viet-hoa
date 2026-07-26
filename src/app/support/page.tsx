import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  Banknote,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import {
  buildDonationQrUrl,
  getDonationMonthlyStats,
  getDonationSummary,
  getDonationTransferCode,
  getOrCreateDonationToken,
  getSupportAccountConfig,
} from '@/lib/donations';
import DonationQrPanel from '@/components/support/DonationQrPanel';
import SupportStatusWatcher from '@/components/support/SupportStatusWatcher';
import styles from './support.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ủng hộ hệ thống',
  description:
    'Đồng hành duy trì Thư viện MOD Việt Hóa và tiếp sức cho cộng đồng bản địa hóa game.',
};

const TIER_LABELS = {
  MEMBER: 'Phàm Nhân',
  NHAN_KIET: 'Nhân Kiệt',
  THIEN_KIEU: 'Thiên Kiêu',
  THAN_THOAI: 'Thần Thoại',
} as const;

export default async function SupportPage() {
  const user = await getCurrentUser();
  const config = getSupportAccountConfig();
  const monthly = await getDonationMonthlyStats();

  const token = user
    ? await getOrCreateDonationToken(user.id)
    : null;
  const summary = user
    ? await getDonationSummary(user)
    : null;
  const guestQrUrl = buildDonationQrUrl({});

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>
            <Heart size={16} />
            Đồng hành cùng MOD Việt Hóa
          </span>
          <h1>Ủng hộ hệ thống</h1>
          <p>
            Mỗi sự đồng hành giúp duy trì máy chủ, bảo toàn thư viện và tạo
            thêm động lực để quản trị viên xây dựng cộng đồng mạnh mẽ, đồng
            thời mang đến nhiều bản Việt hóa chỉn chu hơn.
          </p>
        </section>

        <section className={styles.gratitude}>
          <Sparkles size={24} aria-hidden="true" />
          <div>
            <h2>Cảm tạ tấm lòng của đạo hữu</h2>
            <p>
              MOD Việt Hóa là dự án cộng đồng phi lợi nhuận. Mọi khoản ủng hộ
              đều là tự nguyện và không tạo quyền ưu tiên nội dung. Dù đạo hữu
              đồng hành bằng tài chính, đóng góp bản dịch hay chia sẻ thư viện,
              chúng tôi đều trân trọng như nhau.
            </p>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.donationCard}>
            <div className={styles.cardHeading}>
              <div>
                <span>VietQR · {config.bankName}</span>
                <h2>Quét mã để ủng hộ</h2>
              </div>
              <Banknote size={28} aria-hidden="true" />
            </div>

            {user && token && summary ? (
              <>
                <DonationQrPanel
                  displayToken={token.token}
                  transferCode={getDonationTransferCode(token)}
                  bankBin={config.bankBin}
                  bankAccount={config.bankAccount}
                  bankHolder={config.bankHolder}
                />

                <SupportStatusWatcher
                  initialTransactionCount={summary.transactionCount}
                  initialTotalAmount={summary.totalAmount}
                />
              </>
            ) : (
              <div className={styles.guestQr}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={guestQrUrl}
                  alt={`Mã QR ${config.bankName} ủng hộ MOD Việt Hóa`}
                />
                <div>
                  <h3>Đăng nhập để nhận mã riêng</h3>
                  <p>
                    Mã riêng giúp SePay tự động đối soát và trao Thân phận cho
                    đúng tài khoản của đạo hữu.
                  </p>
                  <Link href="/login?next=/support">Đăng nhập ngay</Link>
                </div>
              </div>
            )}
          </section>

          <aside className={styles.detailsCard}>
            <div className={styles.accountBlock}>
              <span>Ngân hàng</span>
              <strong>
                {config.bankName} ({config.bankCode})
              </strong>
            </div>
            <div className={styles.accountBlock}>
              <span>Số tài khoản</span>
              <strong>{config.bankAccount}</strong>
            </div>
            <div className={styles.accountBlock}>
              <span>Chủ tài khoản</span>
              <strong>{config.bankHolder}</strong>
            </div>

            {summary && (
              <div className={styles.summary}>
                <h2>Dấu ấn đồng hành</h2>
                <dl>
                  <div>
                    <dt>Tổng đã ghi nhận</dt>
                    <dd>
                      {new Intl.NumberFormat('vi-VN').format(
                        summary.totalAmount,
                      )}
                      đ
                    </dd>
                  </div>
                  <div>
                    <dt>Số lần ủng hộ</dt>
                    <dd>{summary.transactionCount}</dd>
                  </div>
                  <div>
                    <dt>Thân phận hiện tại</dt>
                    <dd>{TIER_LABELS[summary.currentTier]}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className={styles.tierRules}>
              <h2>Thân phận tri ân</h2>
              <p>
                <BadgeCheck size={17} />
                Khoản ủng hộ bất kỳ: tối thiểu <b>Nhân Kiệt</b>.
              </p>
              <p>
                <BadgeCheck size={17} />
                Một lần từ 100.000đ hoặc cộng dồn đủ 100.000đ: tối thiểu{' '}
                <b>Thiên Kiêu</b>.
              </p>
              <small>
                Thân phận hiện có không bao giờ bị hạ. Giao dịch SePay được
                chống ghi nhận trùng theo mã giao dịch.
              </small>
            </div>

            <div className={styles.sepayStatus}>
              <ShieldCheck size={18} />
              <div>
                <strong>
                  SePay tháng này: {monthly.incomingCount}/{monthly.freeLimit}
                </strong>
                <span>
                  {monthly.incomingCount >= monthly.freeLimit
                    ? 'Đã chạm hạn mức miễn phí; quản trị viên cần kiểm tra.'
                    : monthly.incomingCount >= monthly.freeLimit - 5
                      ? 'Đang gần hạn mức miễn phí.'
                      : 'Tự động đối soát đang trong ngưỡng an toàn.'}
                </span>
              </div>
            </div>

            <div className={styles.contactLinks}>
              <a
                href={config.messengerUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} />
                Messenger
              </a>
              <a href={config.zaloUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={17} />
                Zalo
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
