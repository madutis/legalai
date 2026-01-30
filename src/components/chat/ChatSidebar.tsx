'use client';

import { Plus, EyeOff, Save } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ConsultationList } from './ConsultationList';
import type { ConsultationMeta } from '@/types';

interface ChatSidebarProps {
  consultations?: ConsultationMeta[];
  selectedConsultationId?: string | null;
  onSelectConsultation?: (id: string) => void;
  onDeleteConsultation?: (id: string, title: string) => void;
  onNewConsultation?: () => void;
  onDontSaveCurrentChat?: () => void;
  onToggleSaveByDefault?: (value: boolean) => void;
  isLoading?: boolean;
  saveByDefault?: boolean;
  isSubscribed?: boolean;
  hasActiveChat?: boolean;
  currentChatSavePreference?: 'save' | 'dont_save' | 'pending';
}

export function ChatSidebar({
  consultations,
  selectedConsultationId,
  onSelectConsultation,
  onDeleteConsultation,
  onNewConsultation,
  onDontSaveCurrentChat,
  onToggleSaveByDefault,
  isLoading = false,
  saveByDefault = true,
  isSubscribed = false,
  hasActiveChat = false,
  currentChatSavePreference,
}: ChatSidebarProps) {
  const handleSelectConsultation = (id: string) => {
    onSelectConsultation?.(id);
  };

  // Show "don't save" button when:
  // - saveByDefault is ON
  // - there's an active chat
  // - current chat is not already marked as dont_save
  const showDontSaveButton =
    saveByDefault &&
    hasActiveChat &&
    currentChatSavePreference !== 'dont_save';

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

        {/* Per-chat don't save button */}
        {showDontSaveButton && (
          <div className="px-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
              onClick={onDontSaveCurrentChat}
            >
              <EyeOff className="h-3.5 w-3.5 mr-2" />
              <span>Nesaugoti sios</span>
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Istorija</SidebarGroupLabel>
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
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
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
          {!isSubscribed && (
            <p className="text-xs text-muted-foreground mt-1">
              Tik prenumeratoriams
            </p>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
