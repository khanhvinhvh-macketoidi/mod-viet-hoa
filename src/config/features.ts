export function isProfileCoverUploadEnabled(): boolean {
  return process.env.PROFILE_COVER_UPLOAD_ENABLED === 'true';
}

export function isSepayAutomationEnabled(): boolean {
  const hasWebhookCredential = Boolean(
    process.env.SEPAY_WEBHOOK_SECRET?.trim() ||
      process.env.SEPAY_WEBHOOK_API_KEY?.trim(),
  );

  return (
    process.env.SEPAY_AUTOMATION_ENABLED !== 'false' &&
    hasWebhookCredential
  );
}
