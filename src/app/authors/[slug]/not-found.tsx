import Link from 'next/link';
import styles from './not-found.module.css';

export default function AuthorNotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span>404</span>
        <h1>Không tìm thấy đạo tịch tác giả</h1>
        <p>
          Hồ sơ này không tồn tại, đã đổi đường dẫn hoặc tài khoản không còn
          hoạt động.
        </p>

        <div className={styles.actions}>
          <Link href="/mods">Về Tàng kinh các</Link>
          <Link href="/">Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
