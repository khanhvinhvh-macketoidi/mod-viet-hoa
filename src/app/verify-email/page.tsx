type VerifyEmailParams = Promise<{
  email?: string;
  status?: string;
}>;

type StatusMessage = {
  title: string;
  body: string;
  tone: string;
};

const STATUS_MESSAGES: Record<string, StatusMessage> = {
  sent: {
    title: 'Kiểm tra hộp thư của đạo hữu',
    body: 'Tài khoản đã được tạo nhưng chưa kích hoạt. Hãy mở liên kết xác thực trong email.',
    tone: 'text-emerald-200 bg-emerald-950/60',
  },
  resent: {
    title: 'Đã gửi lại email xác thực',
    body: 'Nếu địa chỉ hợp lệ và tài khoản đang chờ kích hoạt, email mới đã được gửi.',
    tone: 'text-emerald-200 bg-emerald-950/60',
  },
  required: {
    title: 'Tài khoản chưa được kích hoạt',
    body: 'Đạo hữu cần xác thực email trước khi đăng nhập.',
    tone: 'text-amber-200 bg-amber-950/60',
  },
  verified: {
    title: 'Đạo tịch đã được khai mở',
    body: 'Vui lòng đăng nhập để bắt đầu hành trình tu luyện',
    tone: 'text-emerald-200 bg-emerald-950/60',
  },
  expired: {
    title: 'Liên kết đã hết hạn',
    body: 'Hãy yêu cầu gửi lại email xác thực mới.',
    tone: 'text-amber-200 bg-amber-950/60',
  },
  invalid: {
    title: 'Liên kết không hợp lệ',
    body: 'Không thể xác định tài khoản từ liên kết xác thực này.',
    tone: 'text-red-200 bg-red-950/60',
  },
  'send-failed': {
    title: 'Chưa gửi được email',
    body: 'Tài khoản đã được lưu ở trạng thái chưa kích hoạt. Hãy kiểm tra cấu hình dịch vụ email rồi bấm gửi lại.',
    tone: 'text-red-200 bg-red-950/60',
  },
  'rate-limit': {
    title: 'Đạo hữu thao tác quá nhanh',
    body: 'Vui lòng chờ một lúc trước khi yêu cầu gửi lại.',
    tone: 'text-amber-200 bg-amber-950/60',
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: VerifyEmailParams;
}) {
  const params = await searchParams;
  const statusKey = params.status || 'sent';
  const status = STATUS_MESSAGES[statusKey] || STATUS_MESSAGES.sent;
  const email = params.email?.trim() || '';
  const isVerified = statusKey === 'verified';

  return (
    <section className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-3xl font-black">Xác thực email</h1>

      <div className={`mt-5 rounded-xl p-4 ${status.tone}`}>
        <h2 className="text-2xl font-black">{status.title}</h2>
        <p className="mt-2 text-sm leading-6">{status.body}</p>
      </div>

      {isVerified ? (
        <form
          action="/api/auth/login"
          method="post"
          className="mt-7 space-y-4"
        >
          <input
            type="email"
            name="email"
            defaultValue={email}
            placeholder="Email"
            autoComplete="email"
            maxLength={254}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            autoComplete="current-password"
            maxLength={128}
            required
          />
          <button className="w-full rounded-xl bg-amber-400 p-3 font-bold text-slate-950">
            Đăng nhập
          </button>
        </form>
      ) : (
        <>
          {email && (
            <p className="mt-4 text-sm text-slate-400">
              Email: <strong className="text-slate-200">{email}</strong>
            </p>
          )}

          <form
            action="/api/auth/resend-verification"
            method="post"
            className="mt-6 space-y-4"
          >
            <input
              type="email"
              name="email"
              defaultValue={email}
              placeholder="Email đã đăng ký"
              autoComplete="email"
              maxLength={254}
              required
            />
            <button className="w-full rounded-xl bg-sky-500 p-3 font-bold text-white">
              Gửi lại email xác thực
            </button>
          </form>
        </>
      )}
    </section>
  );
}
