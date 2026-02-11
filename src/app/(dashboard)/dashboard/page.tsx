import Link from "next/link";
import { getUserObjects } from "@/actions/objects";
import { getProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { ObjectList } from "@/components/object-list";

export default async function DashboardPage() {
  const [objectsList, profile] = await Promise.all([
    getUserObjects(),
    getProfile(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Your Objects</h1>
          {profile?.username && (
            <p className="text-sm text-muted-foreground mt-1">
              Public page:{" "}
              <Link
                href={`/u/${profile.username}`}
                className="underline underline-offset-4 hover:text-foreground transition-colors"
                target="_blank"
              >
                /u/{profile.username}
              </Link>
            </p>
          )}
        </div>
        <Link href="/dashboard/objects/new">
          <Button>Add object</Button>
        </Link>
      </div>

      {objectsList.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">
            You haven&apos;t added any objects yet.
          </p>
          <Link href="/dashboard/objects/new">
            <Button>Add your first object</Button>
          </Link>
        </div>
      ) : (
        <ObjectList objects={objectsList} />
      )}
    </div>
  );
}
