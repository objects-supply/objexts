"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";

const navItems = [
  { href: "/dashboard", label: "Objects" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ userEmail, userRole }: { userEmail: string; userRole: UserRole }) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin";

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-medium tracking-tight">
            Objects
          </Link>
          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/dashboard/products/new"
                className={cn(
                  "text-sm transition-colors",
                  pathname === "/dashboard/products/new"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Create Product
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className={cn(
            "text-xs text-muted-foreground hidden sm:inline",
            isAdmin && "decoration-red-500 underline underline-offset-4"
          )}>
            {userEmail}
          </span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
