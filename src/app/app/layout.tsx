import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ensureUserSettings } from '@/lib/user-settings';
import { CanvasSidebar } from '@/components/canvas-sidebar';
import { TopBar } from '@/components/top-bar';
import { getCanvases } from '@/app/actions/canvas';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Ensure user settings exist
  await ensureUserSettings(supabase, user.id);

  // Get canvases for sidebar
  const { data: canvases } = await getCanvases(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <CanvasSidebar 
        canvases={canvases || []} 
        userEmail={user.email || ''} 
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
