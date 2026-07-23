import { ImageResponse } from 'next/og';

export const alt = 'MOD Việt Hóa – Mod và bản Việt hóa game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '76px', background: 'linear-gradient(135deg,#020617 0%,#0f172a 60%,#1e293b 100%)', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 900, letterSpacing: 3, color: '#fbbf24' }}>MOD <span style={{ color: '#fff', marginLeft: 10 }}>VIỆT HÓA</span></div>
        <div style={{ marginTop: 38, maxWidth: 960, fontSize: 68, lineHeight: 1.05, fontWeight: 900 }}>Kho mod và bản Việt hóa dành cho game thủ Việt</div>
        <div style={{ marginTop: 30, fontSize: 28, color: '#cbd5e1' }}>modviethoa.vn</div>
      </div>
    ),
    size,
  );
}
