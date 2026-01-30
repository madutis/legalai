import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read sidebar state from cookie (shadcn pattern)
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ChatSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
