import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getModsByAuthorId } from '@/lib/mods';
import { getUserAvatar } from '@/lib/users';
import ModCard from '@/components/ModCard';
import styles from './profile.module.css';

const ROLE_LABELS = {
  MEMBER: 'Tán Tu',
  MODDER: 'Tông Sư',
  ADMIN: 'Giới Đế',
} satisfies Record<'MEMBER' | 'MODDER' | 'ADMIN', string>;

function getRoleLabel(role: keyof typeof ROLE_LABELS): string {
  return ROLE_LABELS[role];
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const mods = await getModsByAuthorId(user.id);
  const displayName = user.username || user.email;
  const roleLabel = getRoleLabel(user.role);
  const avatar = getUserAvatar(user);

  return (
    <main className={styles.page}>
      <div className={styles.profileShell}>
        <section className={styles.cover} aria-label="Ảnh bìa Đạo Tịch">
          <div className={styles.coverPattern} />
          <div className={styles.coverLore}>
            <span>ĐẠO TỊCH</span>
            <strong>Một niệm nhập đạo, vạn pháp tùy tâm</strong>
          </div>
        </section>

        <section className={styles.identitySection}>
          <div className={styles.avatarWrap}>
            {/* Avatar có thể là URL upload nội bộ hoặc ảnh mặc định từ getUserAvatar. */}
            <img className={styles.avatar} src={avatar} alt={`Avatar của ${displayName}`} />
            <span className={styles.frameAura} aria-hidden="true" />
          </div>

          <div className={styles.identityMain}>
            <div className={styles.nameRow}>
              <div>
                <p className={styles.eyebrow}>Đạo hiệu</p>
                <h1>{displayName}</h1>
                <p className={styles.username}>{user.email}</p>
              </div>

              <div className={styles.badges} aria-label="Thân phận và quyền hạn">
                <span className={styles.identityBadge}>Phàm Nhân</span>
                <span className={styles.roleBadge}>{roleLabel}</span>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span>Cảnh giới: Đang lĩnh ngộ</span>
              <span>Thân phận: Phàm Nhân</span>
              <span>Quyền hạn: {roleLabel}</span>
            </div>

            <p className={styles.emptyBio}>
              Đạo hữu chưa lưu lại đạo ngôn. Hãy cập nhật Đạo Tịch để cộng đồng hiểu thêm về hành trình Việt hóa của bạn.
            </p>

            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/profile/edit">
                Thiết lập Đạo Tịch
              </Link>
              {user.role !== 'MEMBER' ? (
                <Link className={styles.secondaryAction} href="/creator">
                  Vào Tông Sư Các
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <aside className={styles.sidebar}>
            <section className={styles.panel}>
              <h2>Đạo nghiệp</h2>
              <div className={styles.statsGrid}>
                <article>
                  <span>Mod đã đăng</span>
                  <strong>{mods.length}</strong>
                </article>
                <article>
                  <span>Thành tựu</span>
                  <strong>0</strong>
                </article>
                <article className={styles.fullStat}>
                  <span>Đóng góp cộng đồng</span>
                  <strong>{mods.length > 0 ? 'Đã khai đạo' : 'Chưa khai đạo'}</strong>
                </article>
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Thành tựu</h2>
              <div className={styles.achievementEmpty}>
                <span aria-hidden="true">◇</span>
                <p>Thành tựu đầu tiên sẽ xuất hiện khi đạo hữu bắt đầu đóng góp cho Tiên Môn.</p>
              </div>
            </section>

            <section className={styles.panel}>
              <h2>Tu luyện</h2>
              <div className={styles.cultivationTrack}>
                <div className={styles.cultivationHead}>
                  <span>Đạo hạnh hiện tại</span>
                  <strong>Đang lĩnh ngộ</strong>
                </div>
                <div className={styles.progressBar} aria-label="Tiến độ tu luyện chưa được đồng bộ">
                  <span />
                </div>
                <p className={styles.mutedText}>Dữ liệu cảnh giới sẽ được nối trực tiếp từ Cultivation System ở patch tích hợp.</p>
              </div>
            </section>
          </aside>

          <div className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Dấu chân tu luyện</h2>
                  <p>Những cột mốc quan trọng trên hành trình tại MOD Việt Hóa.</p>
                </div>
              </div>
              <div className={styles.timeline}>
                <article>
                  <span className={styles.timelineDot} />
                  <div>
                    <strong>Gia nhập Tiên Môn</strong>
                    <p>Đạo Tịch đã được khởi tạo.</p>
                  </div>
                </article>
                {mods.length > 0 ? (
                  <article>
                    <span className={styles.timelineDot} />
                    <div>
                      <strong>Khai mở mod đầu tiên</strong>
                      <p>Đạo hữu đã bắt đầu để lại truyền thừa cho cộng đồng.</p>
                    </div>
                  </article>
                ) : null}
              </div>
            </section>

            <section className={styles.modsSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Truyền thừa mod</h2>
                  <p>Những bản Việt hóa và mod đang được trưng bày trong Đạo Tịch.</p>
                </div>
                <Link className={styles.secondaryAction} href="/upload">
                  Đăng mod
                </Link>
              </div>

              {mods.length > 0 ? (
                <div className={styles.modsGrid}>
                  {mods.map((mod) => (
                    <ModCard key={mod.id} mod={mod} />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyMods}>
                  <strong>Chưa có truyền thừa nào</strong>
                  <p>Khi đạo hữu đăng mod, tác phẩm sẽ được trưng bày tại đây.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}