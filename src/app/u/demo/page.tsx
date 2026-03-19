import type { Metadata } from "next";
import { PublicProfileClient } from "@/components/public-profile-client";
import { mockProfile, mockItems } from "@/data/mock";

export const metadata: Metadata = {
  title: "Demo Inventory — Alex Chen",
  description: "A curated demo inventory of objects.",
};

export default function DemoPage() {
  return <PublicProfileClient profile={mockProfile} items={mockItems} />;
}
