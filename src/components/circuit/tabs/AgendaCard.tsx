import { Calendar, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgendaCardProps {
  roundId?: string;
}

export function AgendaCard({ roundId }: AgendaCardProps) {
  // For now, show placeholder - in future this could integrate with calendar APIs
  const upcomingMeetings = [
    // Placeholder data structure for future implementation
  ];

  return (
    <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium">This Week's Agenda</span>
      </div>
      
      <div className="p-4">
        {upcomingMeetings.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No meetings scheduled</p>
            <p className="text-xs text-muted-foreground/70">
              Calendar integration coming soon
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Future: Map through upcomingMeetings */}
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Investor Meeting</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Time TBD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
