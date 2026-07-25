import { getCurrentUser } from '@/lib/auth';
import HeaderLogo from '@/components/header/HeaderLogo';
import HeaderNav from '@/components/header/HeaderNav';
import HeaderActions from '@/components/header/HeaderActions';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <>
      <header
        className="iv2-header"
      style={{
        // Keep the slide animation reliable even when the global stylesheet
        // contains a reduced-motion rule that shortens transitions.
        transitionProperty: 'transform, opacity',
        transitionDuration: '360ms, 240ms',
        transitionTimingFunction: 'cubic-bezier(.22, .61, .36, 1), ease',
        willChange: 'transform, opacity',
      }}
    >
        <div className="iv2-container flex min-h-[72px] items-center justify-between gap-3">
          <HeaderLogo />

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            <HeaderNav role={user?.role} />
            <HeaderActions user={user} />
          </div>
        </div>
      </header>

      {/*
       * Header dùng position: fixed nên không chiếm chỗ trong document flow.
       * Spacer này giữ đúng chiều cao 72px cho toàn bộ route, tránh Hero/form
       * bị header che mà không cần sửa riêng từng trang.
       */}
      <div
        aria-hidden="true"
        className="iv2-header-spacer"
        style={{
          height: 72,
          minHeight: 72,
          flex: '0 0 72px',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
