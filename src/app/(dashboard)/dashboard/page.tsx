import { getUserObjects } from "@/actions/objects";
import { getProfile } from "@/actions/profile";
import { VaultClient } from "@/components/vault-client";
import { toItem } from "@/types/item";

export default async function DashboardPage() {
  const [objectsList, profile] = await Promise.all([
    getUserObjects(),
    getProfile(),
  ]);

  const items = objectsList.map(toItem);

  return (
    <VaultClient items={items} username={profile?.username ?? null} />
  );
}
