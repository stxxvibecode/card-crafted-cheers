import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

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
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blush to-amber text-background">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Sendcard</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link to="/create" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
            Create
          </Link>
          {signedIn ? (
            <>
              <Link to="/cards" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
                My cards
              </Link>
              <button onClick={signOut} className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="rounded-full bg-foreground/10 px-3 py-1.5 text-foreground hover:bg-foreground/15">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
