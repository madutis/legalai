'use client';

import { MessageSquare } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

// Topic labels in Lithuanian
const TOPIC_LABELS: Record<string, string> = {
  hiring: 'Idarbinimas',
  termination: 'Atleidimas',
  leave: 'Atostogos',
  wages: 'Atlyginimas',
  disciplinary: 'Drausmine',
  material: 'Materialine',
  contracts: 'Sutartys',
  safety: 'Sauga',
  other: 'Kita',
};

export interface Consultation {
  id: string;
  title: string;
  topic: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ConsultationListProps {
  consultations?: Consultation[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Dabar';
  if (diffMins < 60) return `Pries ${diffMins} min.`;
  if (diffHours < 24) return `Pries ${diffHours} val.`;
  if (diffDays === 1) return 'Vakar';
  if (diffDays < 7) return `Pries ${diffDays} d.`;
  return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
}

export function ConsultationList({
  consultations,
  selectedId,
  onSelect,
  isLoading = false,
}: ConsultationListProps) {
  // Loading state
  if (isLoading) {
    return (
      <SidebarMenu>
        {Array.from({ length: 5 }).map((_, i) => (
          <SidebarMenuItem key={i}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  // Empty state
  if (!consultations || consultations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Nera issaugotu konsultaciju
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Pradekite nauja konsultacija
        </p>
      </div>
    );
  }

  // List of consultations
  return (
    <SidebarMenu>
      {consultations.map((consultation) => (
        <SidebarMenuItem key={consultation.id}>
          <SidebarMenuButton
            isActive={consultation.id === selectedId}
            onClick={() => onSelect(consultation.id)}
            tooltip={consultation.title}
            className="h-auto py-2"
          >
            <MessageSquare className="shrink-0" />
            <div className="flex flex-col items-start gap-0.5 overflow-hidden">
              <span className="truncate w-full text-left">
                {consultation.title || 'Nauja konsultacija'}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {TOPIC_LABELS[consultation.topic] || consultation.topic}
                </Badge>
                <span>{formatRelativeDate(consultation.updatedAt)}</span>
              </div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
