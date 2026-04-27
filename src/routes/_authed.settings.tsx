import { createFileRoute } from "@tanstack/react-router";
import { useMyProfile } from "@/lib/hooks/use-data";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — BillSplit Auto" }] }),
});

const COLORS = ["oklch(0.72 0.18 285)", "oklch(0.82 0.17 175)", "oklch(0.82 0.17 75)", "oklch(0.78 0.16 270)", "oklch(0.72 0.2 10)"];

function Settings() {
  const { data: profile } = useMyProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("Rs.");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setCurrency(profile.currency);
      setColor(profile.identity_color);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => userService.updateProfile({ display_name: name, currency, identity_color: color }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <div className="glass-card space-y-4 rounded-2xl p-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Currency symbol</label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            maxLength={5}
            className="mt-1 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Identity color</span>
          <div className="mt-2 flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-9 w-9 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
      </div>
    </div>
  );
}
