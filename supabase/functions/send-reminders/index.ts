// Supabase Edge Function for sending reminder emails
// Deploy with: supabase functions deploy send-reminders
// Schedule with: supabase functions schedule send-reminders --cron "0 8 * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderNode {
  id: string;
  title: string;
  due_date: string;
  reminder_time: string | null;
  reminder_timezone: string | null;
  user_id: string;
  tree_id: string;
}

interface UserSettings {
  user_id: string;
  language: 'en' | 'id';
  reminder_pref: 'off' | 'daily_summary' | 'due_only';
  timezone: string;
}

interface UserWithEmail {
  id: string;
  email: string;
}

// Email templates
const emailTemplates = {
  en: {
    subject: (count: number) => `Harada Pillars: ${count} task${count > 1 ? 's' : ''} due soon`,
    greeting: 'Hello,',
    intro: 'You have the following tasks due soon:',
    dueToday: 'Due today',
    dueTomorrow: 'Due tomorrow',
    footer: 'Keep up the great work on your goals!',
    unsubscribe: 'To change your reminder preferences, visit your settings.',
  },
  id: {
    subject: (count: number) => `Harada Pillars: ${count} tugas akan jatuh tempo`,
    greeting: 'Halo,',
    intro: 'Anda memiliki tugas-tugas berikut yang akan jatuh tempo:',
    dueToday: 'Jatuh tempo hari ini',
    dueTomorrow: 'Jatuh tempo besok',
    footer: 'Terus semangat mencapai tujuan Anda!',
    unsubscribe: 'Untuk mengubah preferensi pengingat, kunjungi pengaturan Anda.',
  },
};

function formatEmailBody(
  nodes: ReminderNode[],
  language: 'en' | 'id',
  today: Date
): string {
  const t = emailTemplates[language];
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayTasks = nodes.filter(n => n.due_date === todayStr);
  const tomorrowTasks = nodes.filter(n => n.due_date === tomorrowStr);

  let body = `${t.greeting}\n\n${t.intro}\n\n`;

  if (todayTasks.length > 0) {
    body += `📅 ${t.dueToday}:\n`;
    todayTasks.forEach(task => {
      body += `  • ${task.title}\n`;
    });
    body += '\n';
  }

  if (tomorrowTasks.length > 0) {
    body += `📅 ${t.dueTomorrow}:\n`;
    tomorrowTasks.forEach(task => {
      body += `  • ${task.title}\n`;
    });
    body += '\n';
  }

  body += `\n${t.footer}\n\n---\n${t.unsubscribe}`;

  return body;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query nodes with reminders due today or tomorrow
    const { data: reminderNodes, error: nodesError } = await supabase
      .from('nodes')
      .select('id, title, due_date, reminder_time, reminder_timezone, user_id, tree_id')
      .eq('reminder_enabled', true)
      .in('due_date', [todayStr, tomorrowStr]);

    if (nodesError) {
      throw new Error(`Failed to fetch reminder nodes: ${nodesError.message}`);
    }

    if (!reminderNodes || reminderNodes.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group nodes by user
    const nodesByUser = new Map<string, ReminderNode[]>();
    for (const node of reminderNodes) {
      const userId = node.user_id;
      if (!nodesByUser.has(userId)) {
        nodesByUser.set(userId, []);
      }
      nodesByUser.get(userId)!.push(node);
    }

    // Get user settings for all users with reminders
    const userIds = Array.from(nodesByUser.keys());
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, language, reminder_pref, timezone')
      .in('user_id', userIds);

    if (settingsError) {
      throw new Error(`Failed to fetch user settings: ${settingsError.message}`);
    }

    // Create settings map
    const settingsMap = new Map<string, UserSettings>();
    for (const settings of userSettings || []) {
      settingsMap.set(settings.user_id, settings);
    }

    // Get user emails from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const emailMap = new Map<string, string>();
    for (const user of users.users) {
      if (user.email) {
        emailMap.set(user.id, user.email);
      }
    }

    // Send emails
    let sentCount = 0;
    const errors: string[] = [];

    for (const [userId, nodes] of nodesByUser) {
      const settings = settingsMap.get(userId);
      const email = emailMap.get(userId);

      // Skip if user has reminders off or no email
      if (!email) {
        errors.push(`No email for user ${userId}`);
        continue;
      }

      if (settings?.reminder_pref === 'off') {
        continue;
      }

      const language = settings?.language || 'en';
      const t = emailTemplates[language];

      // Build email content
      const subject = t.subject(nodes.length);
      const body = formatEmailBody(nodes, language, today);

      // In production, integrate with your email provider here
      // For now, we log the email that would be sent
      console.log(`Would send email to ${email}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);

      // TODO: Integrate with actual email provider
      // Example with Resend:
      // await resend.emails.send({
      //   from: 'Harada Pillars <noreply@haradapillars.com>',
      //   to: email,
      //   subject: subject,
      //   text: body,
      // });

      sentCount++;
    }

    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
