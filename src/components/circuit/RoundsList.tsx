import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRounds, ROUND_TYPE_LABELS } from "@/hooks/useRounds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ArrowRight, X, RotateCcw } from "lucide-react";
import CreateRoundDialog from "./CreateRoundDialog";
import CloseRoundDialog from "./CloseRoundDialog";
import { cn } from "@/lib/utils";

export function RoundsList() {
  const navigate = useNavigate();
  const { rounds, closeRound, reopenRound, hasOpenRound } = useRounds();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedRoundForClose, setSelectedRoundForClose] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleNavigate = (slug: string) => {
    navigate(`/${slug}/pipeline`);
  };

  const handleCloseRound = (round: { id: string; name: string }) => {
    setSelectedRoundForClose(round);
    setCloseDialogOpen(true);
  };

  const handleConfirmClose = async (reason: string, notes: string) => {
    if (selectedRoundForClose) {
      await closeRound.mutateAsync(selectedRoundForClose.id);
    }
  };

  const handleReopenRound = async (roundId: string) => {
    await reopenRound.mutateAsync(roundId);
  };

  return (
    <>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Rounds</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCreateDialogOpen(true)}
            disabled={hasOpenRound}
            title={hasOpenRound ? "Close current round first" : "Open new round"}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {rounds.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No rounds yet
              </p>
            ) : (
              rounds.map((round) => {
                const isOpen = round.state === "open";
                const canReopen = !hasOpenRound && !isOpen;

                return (
                  <div
                    key={round.id}
                    className={cn(
                      "group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
                      "hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => handleNavigate(round.slug)}
                  >
                    {/* Status dot */}
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isOpen ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />

                    {/* Round name */}
                    <span className="flex-1 text-sm truncate">
                      {round.name}
                    </span>

                    {/* Status badge */}
                    <Badge
                      variant={isOpen ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Badge>

                    {/* Quick actions - show on hover */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      {isOpen ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseRound({ id: round.id, name: round.name });
                          }}
                          title="Close round"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      ) : canReopen ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReopenRound(round.id);
                          }}
                          title="Reopen round"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(round.slug);
                        }}
                        title="Go to round"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <CreateRoundDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />

      {selectedRoundForClose && (
        <CloseRoundDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          roundName={selectedRoundForClose.name}
          onConfirm={handleConfirmClose}
        />
      )}
    </>
  );
}
