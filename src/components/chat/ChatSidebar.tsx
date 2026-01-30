'use client';

import { Plus, Save, PanelLeft } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { ConsultationList } from './ConsultationList';
import type { ConsultationMeta } from '@/types';

interface ChatSidebarProps {
  consultations?: ConsultationMeta[];
  selectedConsultationId?: string | null;
  onSelectConsultation?: (id: string) => void;
  onDeleteConsultation?: (id: string, title: string) => void;
  onNewConsultation?: () => void;
  onToggleSaveByDefault?: (value: boolean) => void;
  isLoading?: boolean;
  saveByDefault?: boolean;
  isSubscribed?: boolean;
}

export function ChatSidebar({
  consultations,
  selectedConsultationId,
  onSelectConsultation,
  onDeleteConsultation,
  onNewConsultation,
  onToggleSaveByDefault,
  isLoading = false,
  saveByDefault = true,
  isSubscribed = false,
}: ChatSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleSelectConsultation = (id: string) => {
    onSelectConsultation?.(id);
  };

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onNewConsultation}
              tooltip="Nauja konsultacija"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <Plus />
              <span>Nauja konsultacija</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Desktop toggle when collapsed - below New consultation */}
        {isCollapsed && (
          <SidebarMenu className="hidden md:block">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip="Išplėsti"
                className="text-muted-foreground hover:text-foreground"
              >
                <PanelLeft />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-2">
            <SidebarGroupLabel>Istorija</SidebarGroupLabel>
            {/* Desktop toggle when expanded - right of Istorija */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="hidden md:flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="Sutraukti"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          <SidebarGroupContent>
            <ConsultationList
              consultations={consultations}
              selectedId={selectedConsultationId}
              onSelect={handleSelectConsultation}
              onDelete={onDeleteConsultation}
              isLoading={isLoading}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-3 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="w-4 h-4" />
              <span>Saugoti</span>
            </div>
            <Switch
              checked={saveByDefault}
              onCheckedChange={onToggleSaveByDefault}
              disabled={!isSubscribed}
            />
          </div>
          {!isSubscribed && !isCollapsed && (
            <p className="text-xs text-muted-foreground mt-1">
              Tik prenumeratoriams
            </p>
          )}
          {/* Icon-only view when collapsed */}
          {isCollapsed && (
            <Save className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
