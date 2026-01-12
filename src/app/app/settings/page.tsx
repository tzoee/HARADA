import { getUserSettings } from '@/app/actions/settings';
import { redirect } from 'next/navigation';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const { data: settings, error } = await getUserSettings();

  if (error || !settings) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
