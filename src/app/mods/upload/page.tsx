import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import UploadFields from '@/components/UploadFields';
import GalleryUploadFields from '@/components/GalleryUploadFields';

type UploadPageProps = {
  searchParams: Promise<{
    ok?: string;
    error?: string;
  }>;
};

export default async function UploadPage({
  searchParams,
}: UploadPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/mods/upload');
  }

  if (user.role !== 'ADMIN' && user.role !== 'MODDER') {
    redirect('/profile?creator=required');
  }

  const params = await searchParams;

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-4xl font-black">
        Đăng mod mới
      </h1>

      <p className="mt-2 text-slate-400">
        Dành cho Tác giả và Quản trị viên. Mod mới sẽ được gắn quyền sở hữu với tài khoản đăng tải.
      </p>

      {params.ok && (
        <p className="mt-5 rounded-xl bg-emerald-950 p-4 text-emerald-200">
          Đăng mod thành công.
        </p>
      )}

      {params.error && (
        <p className="mt-5 rounded-xl bg-red-950 p-4 text-red-200">
          Không thể đăng mod. Hãy kiểm tra dữ liệu và file.
        </p>
      )}

      <form
        action="/api/mods"
        method="post"
        encType="multipart/form-data"
        className="mt-8 grid gap-5"
      >
        <input
          name="title"
          placeholder="Tên mod"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="game"
            placeholder="Tên game"
            required
          />

          <input
            name="category"
            placeholder="Danh mục, ví dụ: Việt hóa"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="version"
            placeholder="Phiên bản mod"
            required
          />

          <input
            name="gameVersion"
            placeholder="Phiên bản game tương thích"
            required
          />
        </div>

        <input
          name="author"
          placeholder="Tác giả / người Việt hóa"
          required
        />

        <textarea
          name="description"
          placeholder="Mô tả"
          rows={6}
          required
        />

        <textarea
          name="installation"
          placeholder="Hướng dẫn cài đặt"
          rows={5}
          required
        />

        <select name="accessLevel">
          <option value="PUBLIC">
            Công khai
          </option>

          <option value="MEMBER">
            Thành viên
          </option>

          <option value="VIP">
            VIP
          </option>
        </select>

        <UploadFields />

        <GalleryUploadFields />

        <button
          type="submit"
          className="
            rounded-xl bg-amber-400 p-3 font-bold
            text-slate-950 transition
            hover:bg-amber-300
          "
        >
          Đăng mod
        </button>
      </form>
    </section>
  );
}