import { Calendar, Clock, User, Video, Users } from "lucide-react";
import { StatusLine } from "./StatusLine";

interface AgendaCardProps {
  roundId?: string;
}

interface Meeting {
  id: number;
  name: string;
  time: string;
  type: "internal" | "investor" | "call";
}

export function AgendaCard({ roundId }: AgendaCardProps) {
  // Placeholder meetings - in future this could integrate with calendar APIs
  const upcomingMeetings: Meeting[] = [
    { id: 1, name: "Weekly Pipeline Review", time: "Mon 10:00 AM", type: "internal" },
    { id: 2, name: "Investor Follow-up Call", time: "Wed 2:00 PM", type: "investor" },
    { id: 3, name: "Term Sheet Discussion", time: "Fri 11:00 AM", type: "call" },
  ];

  const getMeetingIcon = (type: Meeting["type"]) => {
    switch (type) {
      case "internal":
        return <Users className="w-4 h-4 text-muted-foreground" />;
      case "investor":
        return <User className="w-4 h-4 text-muted-foreground" />;
      case "call":
        return <Video className="w-4 h-4 text-muted-foreground" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">This Week's Agenda</span>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="p-3 rounded-lg bg-background border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {getMeetingIcon(meeting.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{meeting.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{meeting.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status="idle"
        idleText="Calendar sync coming soon"
      />
    </>
  );
}
