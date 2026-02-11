import Link from "next/link";
import { Marquee } from "@/components/marquee";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-medium tracking-tight">
            Objects
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-foreground text-background px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-xl text-center px-6 pt-20 pb-12">
          <h1 className="text-4xl sm:text-5xl font-medium tracking-tight mb-6">
            Your inventory,
            <br />
            beautifully shared.
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
            Catalog the objects you own. Share a minimal, elegant timeline of
            your things with the world.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="bg-foreground text-background px-6 py-3 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
            <Link
              href="/u/demo"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              See an example
            </Link>
          </div>
        </div>

        {/* Marquee */}
        <Marquee />
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Objects
          </p>
        </div>
      </footer>
    </div>
  );
}
