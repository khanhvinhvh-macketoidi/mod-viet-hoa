import 'server-only';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_LOGO_URL = 'https://modviethoa.vn/logo-modviethoa.png';

type SendVerificationEmailInput = {
  email: string;
  displayName: string;
  verificationUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function deliveryMode(): 'resend' | 'log' {
  const configured = process.env.EMAIL_DELIVERY_MODE?.trim().toLowerCase();

  if (configured === 'log') return 'log';
  if (configured === 'resend') return 'resend';

  return process.env.NODE_ENV === 'production' ? 'resend' : 'log';
}

export async function sendVerificationEmail({
  email,
  displayName,
  verificationUrl,
}: SendVerificationEmailInput): Promise<void> {
  if (deliveryMode() === 'log') {
    console.info(`[EMAIL VERIFICATION] ${email}: ${verificationUrl}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    'MOD Việt Hóa <no-reply@modviethoa.vn>';

  if (!apiKey) {
    throw new Error('Thiếu RESEND_API_KEY để gửi email xác thực.');
  }

  const safeName = escapeHtml(displayName || 'đạo hữu');
  const safeUrl = escapeHtml(verificationUrl);
  const safeLogoUrl = escapeHtml(
    process.env.EMAIL_LOGO_URL?.trim() || DEFAULT_LOGO_URL,
  );
  const supportEmail = escapeHtml(
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@modviethoa.vn',
  );

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Kích hoạt tài khoản MOD Việt Hóa',
      text: [
        `Xin chào ${displayName || 'đạo hữu'},`,
        '',
        'Cảm ơn đạo hữu đã đăng ký tài khoản tại MOD Việt Hóa.',
        'Hãy mở liên kết dưới đây để kích hoạt tài khoản:',
        verificationUrl,
        '',
        'Liên kết sẽ hết hạn sau 24 giờ.',
        'Nếu đạo hữu không thực hiện đăng ký này, hãy bỏ qua email.',
        '',
        'MOD Việt Hóa',
        'https://modviethoa.vn',
      ].join('\n'),
      html: `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Kích hoạt tài khoản MOD Việt Hóa</title>
  </head>
  <body style="margin:0;padding:0;background:#08090b;color:#f5f1e8;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Kích hoạt tài khoản MOD Việt Hóa để bắt đầu tham gia cộng đồng.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#08090b;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#111318;border:1px solid #6f5528;border-radius:20px;overflow:hidden;box-shadow:0 18px 55px rgba(0,0,0,.45);">
            <tr>
              <td align="center" style="padding:30px 24px 18px;background:linear-gradient(180deg,#19150f 0%,#111318 100%);border-bottom:1px solid #4d3a1e;">
                <img src="${safeLogoUrl}" width="360" alt="MOD Việt Hóa" style="display:block;width:100%;max-width:360px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;" />
                <div style="margin-top:14px;font-size:13px;line-height:1.6;letter-spacing:.8px;text-transform:uppercase;color:#cbb783;">
                  Cộng đồng mod Quỷ Cốc Bát Hoang
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 34px 14px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:700;color:#f0cf7c;">
                  Kích hoạt tài khoản
                </div>
                <p style="margin:20px 0 0;font-size:16px;line-height:1.75;color:#e8e1d4;">
                  Xin chào <strong style="color:#ffffff;">${safeName}</strong>,
                </p>
                <p style="margin:12px 0 0;font-size:16px;line-height:1.75;color:#cfc8bc;">
                  Cảm ơn đạo hữu đã đăng ký tài khoản tại <strong style="color:#f0cf7c;">MOD Việt Hóa</strong>. Chỉ còn một bước nữa để bắt đầu tải mod, theo dõi modder và tham gia cộng đồng.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:18px 34px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#d4af37" style="border-radius:12px;background:linear-gradient(180deg,#f1d477 0%,#c99a2d 100%);box-shadow:0 8px 22px rgba(212,175,55,.22);">
                      <a href="${safeUrl}" style="display:inline-block;padding:15px 28px;font-size:15px;line-height:1;font-weight:800;letter-spacing:.7px;color:#16120a;text-decoration:none;text-transform:uppercase;border-radius:12px;">
                        Kích hoạt tài khoản
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#17191f;border:1px solid #3f3524;border-radius:14px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#d6b45b;">Lưu ý bảo mật</div>
                      <div style="margin-top:8px;font-size:14px;line-height:1.65;color:#bdb6aa;">
                        Liên kết này có hiệu lực trong 24 giờ và chỉ dùng để kích hoạt tài khoản của đạo hữu. Không chia sẻ liên kết với người khác.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 30px;">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#9e978c;">
                  Nút không hoạt động? Hãy sao chép đường dẫn sau và mở trong trình duyệt:
                </p>
                <div style="padding:13px 14px;background:#0b0c0f;border:1px solid #2c2f36;border-radius:10px;font-family:Consolas,Monaco,'Courier New',monospace;font-size:12px;line-height:1.6;color:#d8c690;word-break:break-all;">
                  ${safeUrl}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:22px 34px;background:#0d0f13;border-top:1px solid #2a2d33;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:1.65;color:#8f8a82;">
                  Nếu đạo hữu không thực hiện đăng ký này, hãy bỏ qua email. Tài khoản sẽ không được kích hoạt.
                </p>
                <p style="margin:14px 0 0;font-size:13px;line-height:1.65;color:#aaa398;">
                  <a href="https://modviethoa.vn" style="color:#d6b45b;text-decoration:none;font-weight:700;">modviethoa.vn</a>
                  &nbsp;•&nbsp;
                  <a href="mailto:${supportEmail}" style="color:#d6b45b;text-decoration:none;">${supportEmail}</a>
                </p>
                <p style="margin:10px 0 0;font-size:11px;line-height:1.5;color:#666b74;">
                  © ${new Date().getFullYear()} MOD Việt Hóa. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Không thể gửi email xác thực (${response.status}): ${detail.slice(0, 500)}`,
    );
  }
}
