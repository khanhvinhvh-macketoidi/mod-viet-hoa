import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import ProfileMediaEditor from '@/components/profile/ProfileMediaEditor';
import styles from './profile-edit.module.css';

export default async function ProfileEditPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile/edit');
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Đạo tịch cá nhân</span>
            <h1>Chỉnh sửa đạo tịch</h1>
            <p>
              Cập nhật ảnh đại diện, ảnh bìa và những thông tin sẽ hiển thị
              trên trang cá nhân cũng như hồ sơ tác giả công khai.
            </p>
          </div>
        </header>

        <ProfileMediaEditor
          initialAvatar={
            user.profile?.avatar || '/images/default-avatar.png'
          }
          initialCover={user.profile?.coverImage || ''}
          initialCoverPosition={{
            x: user.profile?.coverPosition?.x ?? 50,
            y: user.profile?.coverPosition?.y ?? 50,
          }}
        />

        <ProfileEditForm
          initialData={{
            displayName: user.profile?.displayName ?? user.name,
            bio: user.profile?.bio ?? '',
            location: user.profile?.location ?? '',
            website: user.profile?.website ?? '',
            facebook: user.profile?.socialLinks?.facebook ?? '',
            youtube: user.profile?.socialLinks?.youtube ?? '',
            discord: user.profile?.socialLinks?.discord ?? '',
            github: user.profile?.socialLinks?.github ?? '',
            steam: user.profile?.socialLinks?.steam ?? '',
          }}
        />
      </div>
    </main>
  );
}
