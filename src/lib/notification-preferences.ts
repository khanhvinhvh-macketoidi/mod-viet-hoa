import fs from 'node:fs/promises';
import path from 'node:path';

export type NotificationPreferenceKey =
  | 'follow'
  | 'modPublished'
  | 'comment'
  | 'reply'
  | 'review';

export interface NotificationPreferences {
  follow: boolean;
  modPublished: boolean;
  comment: boolean;
  reply: boolean;
  review: boolean;
}

interface StoredNotificationPreferences {
  userId: string;
  preferences: NotificationPreferences;
  updatedAt: string;
}

const preferencesPath = path.join(
  process.cwd(),
  'data',
  'notification-preferences.json',
);

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  follow: true,
  modPublished: true,
  comment: true,
  reply: true,
  review: true,
};

async function ensurePreferencesFile(): Promise<void> {
  await fs.mkdir(path.dirname(preferencesPath), {
    recursive: true,
  });

  try {
    await fs.access(preferencesPath);
  } catch {
    await fs.writeFile(
      preferencesPath,
      JSON.stringify([], null, 2),
      'utf8',
    );
  }
}

async function readAll(): Promise<StoredNotificationPreferences[]> {
  await ensurePreferencesFile();

  const content = await fs.readFile(preferencesPath, 'utf8');

  if (!content.trim()) {
    return [];
  }

  return JSON.parse(content) as StoredNotificationPreferences[];
}

async function saveAll(
  records: StoredNotificationPreferences[],
): Promise<void> {
  await fs.writeFile(
    preferencesPath,
    JSON.stringify(records, null, 2),
    'utf8',
  );
}

function normalizePreferences(
  value?: Partial<NotificationPreferences>,
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(value ?? {}),
  };
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const records = await readAll();
  const record = records.find((item) => item.userId === userId);

  return normalizePreferences(record?.preferences);
}

export async function isNotificationEnabled(
  userId: string,
  key: NotificationPreferenceKey,
): Promise<boolean> {
  const preferences = await getNotificationPreferences(userId);
  return preferences[key];
}

export async function saveNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const records = await readAll();
  const index = records.findIndex((item) => item.userId === userId);
  const previous =
    index >= 0
      ? records[index].preferences
      : DEFAULT_NOTIFICATION_PREFERENCES;

  const preferences = normalizePreferences({
    ...previous,
    ...input,
  });

  const nextRecord: StoredNotificationPreferences = {
    userId,
    preferences,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    records[index] = nextRecord;
  } else {
    records.push(nextRecord);
  }

  await saveAll(records);
  return preferences;
}
