import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bird } from "lucide-react";

export function SiteNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-[15px] tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground">
            <Bird className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="font-display text-xl leading-none">Pigeon</span>
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 text-sm">
          <Link
            to="/create"
            className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            Create
          </Link>
          {signedIn ? (
            <>
              <Link
                to="/cards"
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
              >
                My cards
              </Link>
              <button
                onClick={signOut}
                className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-foreground/10 px-3 py-1.5 text-foreground hover:bg-foreground/15"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
