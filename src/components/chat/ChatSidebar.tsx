'use client';

import { useRouter } from 'next/navigation';
import { Plus, Settings } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ConsultationList, type Consultation } from './ConsultationList';

interface ChatSidebarProps {
  consultations?: Consultation[];
  selectedConsultationId?: string | null;
  onSelectConsultation?: (id: string) => void;
  isLoading?: boolean;
}

export function ChatSidebar({
  consultations,
  selectedConsultationId,
  onSelectConsultation,
  isLoading = false,
}: ChatSidebarProps) {
  const router = useRouter();

  const handleNewConsultation = () => {
    // Clear context and go to onboarding
    localStorage.removeItem('legalai-context');
    router.push('/');
  };

  const handleSelectConsultation = (id: string) => {
    onSelectConsultation?.(id);
  };

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleNewConsultation}
              tooltip="Nauja konsultacija"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <Plus />
              <span>Nauja konsultacija</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Istorija</SidebarGroupLabel>
          <SidebarGroupContent>
            <ConsultationList
              consultations={consultations}
              selectedId={selectedConsultationId}
              onSelect={handleSelectConsultation}
              isLoading={isLoading}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Nustatymai" disabled>
              <Settings />
              <span>Saugoti pagal numatyma</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
