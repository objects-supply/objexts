import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6">
        <Plus className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        No objects yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Start curating your collection. Add your first object to the vault.
      </p>
      <Button onClick={onAdd} size="sm" className="rounded-full px-5">
        Add Object
      </Button>
    </div>
  );
}
