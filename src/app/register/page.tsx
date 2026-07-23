"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  exists: "Email này đã được sử dụng.",
  "password-mismatch": "Mật khẩu nhập lại không khớp.",
  "rate-limit": "Đạo hữu khai mở đạo tịch quá nhanh. Vui lòng thử lại sau.",
  invalid: "Thông tin khai mở đạo tịch chưa hợp lệ.",
};

function RegisterForm() {
  const searchParams = useSearchParams();

  const serverErrorCode = searchParams.get("error");
  const serverError = serverErrorCode
    ? ERROR_MESSAGES[serverErrorCode] || ERROR_MESSAGES.invalid
    : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittedMismatch, setSubmittedMismatch] = useState(false);

  const confirmState = useMemo(() => {
    if (!confirmPassword) {
      return "empty" as const;
    }

    return password === confirmPassword
      ? ("match" as const)
      : ("mismatch" as const);
  }, [password, confirmPassword]);

  const showMismatch =
    confirmState === "mismatch" || submittedMismatch;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (password !== confirmPassword) {
      event.preventDefault();
      setSubmittedMismatch(true);
      return;
    }

    setSubmittedMismatch(false);
  }

  return (
    <section className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-black">Khai mở đạo tịch</h1>

      <p className="mt-2 text-sm text-slate-400">
        Sau khi khai mở đạo tịch, đạo hữu cần mở email xác thực để hoàn tất nhập môn.
      </p>

      {serverError && (
        <p
          className="mt-4 rounded-lg bg-red-950 p-3 text-red-200"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <form
        action="/api/auth/register"
        method="post"
        className="mt-7 space-y-4"
        onSubmit={handleSubmit}
      >
        <input
          name="name"
          placeholder="Tên hiển thị"
          minLength={2}
          maxLength={40}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Mật khẩu (tối thiểu 8 ký tự)"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setSubmittedMismatch(false);
          }}
          required
        />

        <div>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setSubmittedMismatch(false);
            }}
            aria-invalid={showMismatch}
            aria-describedby="confirm-password-status"
            required
          />

          <div
            id="confirm-password-status"
            className="mt-2 min-h-5 text-sm font-semibold"
            aria-live="polite"
          >
            {confirmState === "match" && (
              <span className="text-emerald-400">
                ✓ Mật khẩu đã khớp.
              </span>
            )}

            {showMismatch && (
              <span className="text-red-400">
                ✕ Mật khẩu nhập lại không khớp.
              </span>
            )}
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <label>
            Trang web cá nhân
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-amber-400 p-3 font-bold text-slate-950"
        >
          Khai mở đạo tịch và gửi linh phù xác thực
        </button>
      </form>
    </section>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-5 py-16">
          <p className="text-sm text-slate-400">
            Đang tải biểu mẫu...
          </p>
        </section>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}