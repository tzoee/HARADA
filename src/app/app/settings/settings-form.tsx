'use client';

import { useState, useTransition } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUIStore } from '@/store/ui-store';
import { updateUserSettings } from '@/app/actions/settings';
import type { UserSettings } from '@/types/database';

interface SettingsFormProps {
  initialSettings: UserSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { setLanguage, setTheme } = useUIStore();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  
  const [language, setLocalLanguage] = useState(initialSettings.language);
  const [theme, setLocalTheme] = useState(initialSettings.theme);
  const [reminderPref, setReminderPref] = useState(initialSettings.reminder_pref);
  const [timezone, setTimezone] = useState(initialSettings.timezone);

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await updateUserSettings({
        language,
        theme,
        reminder_pref: reminderPref,
        timezone,
      });

      if (!error) {
        // Update Zustand store
        setLanguage(language);
        setTheme(theme);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  // Common timezones
  const timezones = [
    'UTC',
    'Asia/Jakarta',
    'Asia/Singapore',
    'Asia/Tokyo',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney',
  ];

  return (
    <div className="space-y-8">
      {/* Language */}
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <Select value={language} onValueChange={(v) => setLocalLanguage(v as 'en' | 'id')}>
          <SelectTrigger id="language" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="id">Bahasa Indonesia</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose your preferred language for the interface.
        </p>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <Select value={theme} onValueChange={(v) => setLocalTheme(v as 'dark' | 'light')}>
          <SelectTrigger id="theme" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Select your preferred color theme.
        </p>
      </div>

      {/* Reminder Preference */}
      <div className="space-y-2">
        <Label htmlFor="reminder">Reminder Notifications</Label>
        <Select value={reminderPref} onValueChange={(v) => setReminderPref(v as 'off' | 'daily_summary' | 'due_only')}>
          <SelectTrigger id="reminder" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="due_only">Due dates only</SelectItem>
            <SelectItem value="daily_summary">Daily summary</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Choose how you want to receive reminder notifications.
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Set your timezone for accurate reminder scheduling.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
