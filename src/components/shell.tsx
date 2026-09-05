import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useBrand } from "@/lib/use-brand";
import { useAuth } from "@/lib/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "Home" },
  { to: "/settings", label: "Settings" },
] as const;

function AuthControl() {
  const { user, ready, signInWithGoogle, signInWithGithub, signOut } = useAuth();

  if (!ready) return <span className="size-8" aria-hidden />;

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1 rounded-full border border-ink/12 bg-white/70 px-3.5 py-2 text-[13px] font-medium text-ink/55 transition-colors hover:text-ink">
            Sign in
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Sign in to sync your helpers</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signInWithGoogle()}>
            Continue with Google
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void signInWithGithub()}>
            Continue with GitHub
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="ml-1 grid size-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-canvas"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.email && <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [bigText, setBigText] = useState(false);
  const { brand } = useBrand();

  useEffect(() => {
    document.documentElement.classList.toggle("bigtext", bigText);
  }, [bigText]);

  return (
    <div className="board relative min-h-screen overflow-hidden font-body text-ink">
      <div className="relative mx-auto flex min-h-screen max-w-[1080px] flex-col px-5 py-5 sm:px-8">
        <header className="sticky top-4 z-20">
          <div className="flex items-center justify-between gap-4 rounded-full border border-ink/[.12] bg-white/70 py-2 pr-2 pl-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-ink font-display text-[13px] font-bold text-canvas">
                {brand.brandInitials}
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">
                {brand.brandName}
              </span>
            </Link>

            <div className="flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink/55 transition-colors hover:text-ink"
                  activeProps={{ className: "bg-brand-soft text-brand hover:text-brand" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => setBigText((v) => !v)}
                aria-pressed={bigText}
                className="ml-1 rounded-full border border-ink/12 bg-white/70 px-3.5 py-2 text-[13px] font-medium text-ink/55 transition-colors hover:text-ink"
              >
                Bigger text
              </button>
              <AuthControl />
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <p className="mt-16 pb-4 text-center text-xs text-ink/35">
          Made to be simple enough for anyone.
        </p>
      </div>
    </div>
  );
}
