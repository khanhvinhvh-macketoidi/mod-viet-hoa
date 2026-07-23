import { redirect } from 'next/navigation';

export default function LegacyAdminUploadPage() {
  redirect('/mods/upload');
}
