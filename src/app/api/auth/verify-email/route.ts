import { NextResponse } from 'next/server';
import {
  hashEmailVerificationToken,
  isEmailVerificationExpired,
} from '@/lib/email-verification';
import { getUsers, saveUsers } from '@/lib/store';
import { createSafeRedirectUrl } from '@/lib/security/request-security';

function redirectToVerifyPage(
  request: Request,
  status: string,
  email?: string,
) {
  const url = createSafeRedirectUrl('/verify-email', request);
  url.searchParams.set('status', status);

  if (email) {
    url.searchParams.set('email', email);
  }

  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token')?.trim();

  if (!token || token.length > 200) {
    return redirectToVerifyPage(request, 'invalid');
  }

  const tokenHash = hashEmailVerificationToken(token);
  const users = await getUsers();
  const user = users.find(
    (item) => item.emailVerificationTokenHash === tokenHash,
  );

  if (!user) {
    return redirectToVerifyPage(request, 'invalid');
  }

  // Liên kết thuộc một tài khoản đã xác thực thì luôn dẫn về màn hình
  // đăng nhập, không bị xem là liên kết hết hạn.
  if (user.emailVerifiedAt || user.emailVerificationRequired === false) {
    return redirectToVerifyPage(request, 'verified', user.email);
  }

  if (isEmailVerificationExpired(user.emailVerificationExpiresAt)) {
    return redirectToVerifyPage(request, 'expired', user.email);
  }

  const now = new Date().toISOString();
  user.emailVerifiedAt = now;
  user.emailVerificationRequired = false;
  user.isActive = true;
  user.updatedAt = now;

  // Giữ lại hash của liên kết đã dùng để những lần nhấp sau vẫn có thể
  // nhận diện đúng tài khoản đã kích hoạt. Token này không còn tạo session.
  user.emailVerificationExpiresAt = undefined;

  await saveUsers(users);

  return redirectToVerifyPage(request, 'verified', user.email);
}
