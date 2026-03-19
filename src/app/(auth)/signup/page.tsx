"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { signUp } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="flex items-center px-6 py-5 max-w-6xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Inventory
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your vault
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Username</Label>
              <Input
                name="username"
                type="text"
                placeholder="yourname"
                pattern="[a-z0-9_-]{3,30}"
                title="3-30 characters, lowercase letters, numbers, hyphens, underscores"
                className="mt-1"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your page will be at /u/yourname
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                className="mt-1"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full rounded-full h-11 text-sm font-medium"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-foreground font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
