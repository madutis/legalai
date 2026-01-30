'use client';

import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConsultationMeta } from '@/types';

// Topic labels in Lithuanian
const TOPIC_LABELS: Record<string, string> = {
  hiring: 'Įdarbinimas',
  termination: 'Atleidimas',
  leave: 'Atostogos',
  wages: 'Atlyginimas',
  disciplinary: 'Drausminė',
  material: 'Materialinė',
  contracts: 'Sutartys',
  safety: 'Sauga',
  other: 'Kita',
};

// Re-export type for backwards compatibility
export type Consultation = ConsultationMeta & { createdAt?: Date };

interface ConsultationListProps {
  consultations?: ConsultationMeta[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string, title: string) => void;
  isLoading?: boolean;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Dabar';
  if (diffMins < 60) return `Prieš ${diffMins} min.`;
  if (diffHours < 24) return `Prieš ${diffHours} val.`;
  if (diffDays === 1) return 'Vakar';
  if (diffDays < 7) return `Prieš ${diffDays} d.`;
  return date.toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' });
}

export function ConsultationList({
  consultations,
  selectedId,
  onSelect,
  onDelete,
  isLoading = false,
}: ConsultationListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center group-data-[collapsible=icon]:hidden">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Nėra išsaugotų konsultacijų
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Pradėkite naują konsultaciją
        </p>
      </div>
    );
  }

  // List of consultations
  return (
    <SidebarMenu>
      {consultations.map((consultation) => {
        const isHovered = hoveredId === consultation.id;
        const isSelected = consultation.id === selectedId;
        const showDelete = onDelete && (isHovered || isSelected);

        return (
          <SidebarMenuItem
            key={consultation.id}
            onMouseEnter={() => setHoveredId(consultation.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex items-center w-full gap-1">
              <SidebarMenuButton
                isActive={isSelected}
                onClick={() => onSelect(consultation.id)}
                tooltip={consultation.title || 'Nauja konsultacija'}
                className="h-auto py-2 flex-1 min-w-0"
              >
                <MessageSquare className="shrink-0" />
                <div className="flex flex-col items-start gap-0.5 overflow-hidden min-w-0">
                  <span className="truncate w-full text-left">
                    {consultation.title || 'Nauja konsultacija'}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      {TOPIC_LABELS[consultation.topic] || consultation.topic}
                    </Badge>
                    <span className="shrink-0" suppressHydrationWarning>{formatRelativeDate(consultation.updatedAt)}</span>
                  </div>
                </div>
              </SidebarMenuButton>

              {/* Delete button - show on hover, hide when collapsed */}
              {showDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(consultation.id, consultation.title || 'Nauja konsultacija');
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
