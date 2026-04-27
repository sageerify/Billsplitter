import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { useMyGroups } from "@/lib/hooks/use-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { groupService } from "@/services/group.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/groups")({
  component: GroupsList,
  head: () => ({ meta: [{ title: "Groups — BillSplit Auto" }] }),
});

const EMOJIS = ["💸", "🏠", "✈️", "🍔", "🎉", "🚗", "🏖️", "🎬", "⚽", "🎓"];

function GroupsList() {
  const { data: groups, isLoading } = useMyGroups();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your Groups</h1>
          <p className="text-sm text-muted-foreground">
            Track shared expenses across {groups?.length ?? 0} active groups.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> New Group
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(groups ?? []).map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="glass-card group relative overflow-hidden rounded-2xl p-5 transition hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xl">{g.emoji}</span>
                  <h3 className="mt-3 text-lg font-bold">{g.name}</h3>
                  {g.description && <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">Created {new Date(g.created_at).toLocaleDateString()}</span>
                <ArrowRight className="h-4 w-4 text-mint transition group-hover:translate-x-1" />
              </div>
            </Link>
          ))}

          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-surface/30 p-5 text-muted-foreground transition hover:border-primary hover:text-foreground"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Create New Group</p>
            <p className="text-xs">Start splitting bills with friends</p>
          </button>
        </div>
      )}

      <CreateGroupModal open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CreateGroupModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💸");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () => groupService.createGroup({ name, emoji, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created");
      onOpenChange(false);
      setName(""); setDescription(""); setEmoji("💸");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lahore Trip"
              className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Emoji</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    emoji === e ? "border-primary bg-primary/20" : "border-border bg-surface"
                  }`}
                >{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
              className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
