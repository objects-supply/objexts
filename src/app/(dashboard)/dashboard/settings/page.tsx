"use client";

import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Profile } from "@/lib/db/schema";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    const result = await updateProfile(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded max-w-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight mb-8">Settings</h1>

      <form action={handleSubmit} className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            defaultValue={profile?.username ?? ""}
            pattern="[a-z0-9_-]{3,30}"
            title="3-30 characters, lowercase"
            required
          />
          <p className="text-xs text-muted-foreground">
            Your public page: /u/{profile?.username}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={profile?.displayName ?? ""}
            placeholder="Your display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={profile?.bio ?? ""}
            placeholder="A short bio for your profile..."
            rows={3}
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
