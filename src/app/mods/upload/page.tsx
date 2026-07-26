import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import UploadFields from '@/components/UploadFields';
import GalleryUploadFields from '@/components/GalleryUploadFields';
import ChunkedModUploadForm from '@/components/ChunkedModUploadForm';
import RichTextField from '@/components/rich-text/RichTextField';

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

      <ChunkedModUploadForm>
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

        <RichTextField
          name="description"
          label="Mô tả"
          placeholder="Mô tả"
          rows={6}
          maxLength={20_000}
          required
        />

        <RichTextField
          name="installation"
          label="Hướng dẫn cài đặt"
          placeholder="Hướng dẫn cài đặt"
          rows={5}
          maxLength={20_000}
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

      </ChunkedModUploadForm>
    </section>
  );
}