"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  if (!email || !password || !username) {
    return { error: "All fields are required" };
  }

  // Validate username format
  if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
    return {
      error:
        "Username must be 3-30 characters, lowercase letters, numbers, hyphens, or underscores",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: username,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        error:
          "Too many signup emails were sent. Please wait a few minutes and check your inbox/spam for the previous confirmation email.",
      };
    }
    return { error: error.message };
  }

  // In production, email confirmation is often enabled. Supabase can return a
  // user with no active session until the email is confirmed.
  if (!data.session) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      message:
        "Account created. Check your email to confirm your account, then log in.",
    };
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
