import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Gamepad2,
  PackageOpen,
} from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/store';
import { canManageMod } from '@/lib/permissions';
import EditUploadFields from '@/components/EditUploadFields';
import EditModReleaseActions from '@/components/versions/EditModReleaseActions';

type EditModPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditModPage({
  params,
  searchParams,
}: EditModPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const query = await searchParams;
  const mod = await getModById(id);

  if (!mod || !canManageMod(user, mod)) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <Link
        href={user.role === 'ADMIN' ? '/admin/mods' : '/creator/mods'}
        className="
          inline-flex items-center gap-2
          text-sm font-semibold text-slate-400
          transition hover:text-amber-300
        "
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại quản lý mod
      </Link>

      <div className="mt-6">
        <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
          Chỉnh sửa nội dung
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Sửa mod
        </h1>

        <p className="mt-2 text-slate-400">
          Đạo hữu có thể cập nhật thông tin, thay ảnh bìa hoặc thay tệp tải xuống.
        </p>
      </div>

      {query.error && (
        <div
          className="
            mt-6 rounded-xl border border-red-400/20
            bg-red-500/10 px-4 py-3 text-red-200
          "
        >
          Không thể cập nhật mod. Hãy kiểm tra lại thông tin.
        </div>
      )}

      <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mod hiện tại</p>
          <p className="mt-2 truncate font-bold text-slate-100" title={mod.title}>{mod.title}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><PackageOpen className="h-3.5 w-3.5" /> Phiên bản</p>
          <p className="mt-2 font-bold text-amber-300">v{mod.version}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Gamepad2 className="h-3.5 w-3.5" /> Phiên bản game</p>
          <p className="mt-2 font-bold text-slate-200">{mod.gameVersion}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Download className="h-3.5 w-3.5" /> Lượt tải</p>
          <p className="mt-2 font-bold text-slate-200">{mod.downloads.toLocaleString('vi-VN')}</p>
        </div>
      </div>

      <form
        id="edit-mod-form"
        action={`/api/admin/mods/${mod.id}/update`}
        method="post"
        encType="multipart/form-data"
        className="
          mt-8 grid gap-6 rounded-3xl
          border border-white/10 bg-slate-900 p-6
        "
      >
        <div className="grid gap-2">
          <label
            htmlFor="title"
            className="text-sm font-bold text-slate-200"
          >
            Tên mod
          </label>

          <input
            id="title"
            name="title"
            defaultValue={mod.title}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label
              htmlFor="game"
              className="text-sm font-bold text-slate-200"
            >
              Tên game
            </label>

            <input
              id="game"
              name="game"
              defaultValue={mod.game}
              required
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="category"
              className="text-sm font-bold text-slate-200"
            >
              Danh mục
            </label>

            <input
              id="category"
              name="category"
              defaultValue={mod.category}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-bold text-slate-200">Phiên bản mod hiện tại</p>
            <p className="mt-2 text-lg font-black text-amber-300">v{mod.version}</p>
            <p className="mt-1 text-xs text-slate-500">Chỉ thay đổi khi phát hành phiên bản mới.</p>
            <input type="hidden" name="version" value={mod.version} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-bold text-slate-200">Phiên bản game hiện tại</p>
            <p className="mt-2 text-lg font-black text-slate-100">{mod.gameVersion}</p>
            <p className="mt-1 text-xs text-slate-500">Cập nhật cùng một bản phát hành mới.</p>
            <input type="hidden" name="gameVersion" value={mod.gameVersion} />
          </div>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="author"
            className="text-sm font-bold text-slate-200"
          >
            Tác giả / người Việt hóa
          </label>

          <input
            id="author"
            name="author"
            defaultValue={mod.author}
            required
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="description"
            className="text-sm font-bold text-slate-200"
          >
            Mô tả
          </label>

          <textarea
            id="description"
            name="description"
            defaultValue={mod.description}
            rows={8}
            required
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="installation"
            className="text-sm font-bold text-slate-200"
          >
            Hướng dẫn cài đặt
          </label>

          <textarea
            id="installation"
            name="installation"
            defaultValue={mod.installation}
            rows={7}
            required
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="accessLevel"
            className="text-sm font-bold text-slate-200"
          >
            Quyền truy cập
          </label>

          <select
            id="accessLevel"
            name="accessLevel"
            defaultValue={mod.accessLevel}
          >
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
        </div>

  <EditUploadFields
  currentCoverUrl={mod.coverUrl}
  currentCoverPositionX={mod.coverPositionX}
  currentCoverPositionY={mod.coverPositionY}
  currentFileName={mod.fileName}
  currentFileSize={mod.fileSize}
/>      

      </form>

      <EditModReleaseActions
        modId={mod.id}
        currentVersion={mod.version}
        currentGameVersion={mod.gameVersion}
        saveFormId="edit-mod-form"
      />
    </section>
  );
}