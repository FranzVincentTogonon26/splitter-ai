"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          💸 Splitter AI
        </Link>
        <nav className="flex items-center gap-4">
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Get started</Button>
            </SignUpButton>
          </Show>
        </nav>
      </div>
    </header>
  );
}
