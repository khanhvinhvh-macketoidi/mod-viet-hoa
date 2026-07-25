type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default function LoginPage({
  searchParams,
}: LoginPageProps) {
  return <AuthForm searchParams={searchParams} />;
}

async function AuthForm({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <section
      className="relative z-10 mx-auto max-w-md px-5 pb-16 pt-12 sm:pt-16"
    >
      <h1 className="text-3xl font-black">Đăng nhập</h1>

      {params.error && (
        <p className="mt-4 rounded-lg bg-red-950 p-3 text-red-200">
          Email hoặc mật khẩu không đúng.
        </p>
      )}

      <form
        action="/api/auth/login"
        method="post"
        className="mt-7 space-y-4"
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Mật khẩu"
          required
        />

        <button className="w-full rounded-xl bg-amber-400 p-3 font-bold text-slate-950">
          Đăng nhập
        </button>
      </form>
    </section>
  );
}
