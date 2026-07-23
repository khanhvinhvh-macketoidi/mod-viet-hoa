'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#030712',
          color: '#f4fbff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main
          style={{
            width: 'min(92vw, 520px)',
            padding: '32px',
            textAlign: 'center',
            border: '1px solid rgba(54,215,255,.18)',
            borderRadius: '22px',
            background: 'rgba(7,20,35,.88)',
          }}
        >
          <p
            style={{
              color: '#36d7ff',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
            }}
          >
            MOD THƯ VIỆN
          </p>

          <h1>Hệ thống đang tạm gián đoạn</h1>
          <p style={{ color: '#92a9bb', lineHeight: 1.7 }}>
            Vui lòng thử lại sau vài giây. Lỗi đã được ghi vào nhật ký
            máy chủ.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '18px',
              border: 0,
              borderRadius: '12px',
              padding: '12px 18px',
              background: 'linear-gradient(135deg,#36d7ff,#568dff)',
              color: '#03101b',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Vận công thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
