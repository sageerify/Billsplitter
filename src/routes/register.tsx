import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, Check } from "lucide-react";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — BillSplit Auto" }] }),
});

const COLORS = [
  "oklch(0.72 0.18 285)",
  "oklch(0.82 0.17 175)",
  "oklch(0.82 0.17 75)",
  "oklch(0.78 0.16 270)",
  "oklch(0.72 0.2 10)",
];

function passwordStrength(p: string): { label: string; pct: number; tone: string } {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map = [
    { label: "Too short", pct: 10, tone: "bg-destructive" },
    { label: "Weak", pct: 30, tone: "bg-destructive" },
    { label: "Fair", pct: 55, tone: "bg-warning" },
    { label: "Moderate", pct: 75, tone: "bg-mint" },
    { label: "Strong", pct: 100, tone: "bg-success" },
  ];
  return map[score];
}

function RegisterPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (!agree) return toast.error("Please agree to the Terms");
    setLoading(true);
    try {
      await authService.signUp(email, password, name);
      toast.success("Account created — welcome!");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">BillSplit Auto</span>
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join the ecosystem of automated group finances.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldText icon={User} label="Full name" value={name} onChange={setName} placeholder="Enter your name" required />
            <FieldText icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
            <div>
              <FieldText icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
              {password && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full transition-all ${strength.tone}`} style={{ width: `${strength.pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Strength: {strength.label}
                  </p>
                </div>
              )}
            </div>
            <FieldText icon={Lock} label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" required />

            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Select identity color
              </span>
              <div className="mt-2 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`}
                    aria-label="Choose color"
                  />
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-primary"
              />
              <span>I agree to the Terms of Service and acknowledge the Privacy Policy</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface py-3 font-medium hover:bg-surface-elevated"
          >
            Continue with Google
          </button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-gradient-mint font-medium">Log in</Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-mint/20 via-background to-violet/30" />
        <div className="relative z-10 flex h-full flex-col justify-center p-12">
          <h2 className="text-5xl font-bold leading-tight">
            The future of group <br />
            <span className="text-gradient-mint">ledgering.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Experience precision-engineered expense tracking for high-velocity lifestyles.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Auto-sync across all devices", "Smart split algorithms", "Multi-currency support", "Real-time balance graph"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-mint">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FieldText({
  icon: Icon, label, value, onChange, type = "text", placeholder, required,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-input bg-surface px-10 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </label>
  );
}
