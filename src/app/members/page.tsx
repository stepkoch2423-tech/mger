import { redirect } from "next/navigation";
import { MembersScreen } from "@/components/members/members-screen";
import { getCurrentUser } from "@/lib/auth/session";
import { getMembersPayload } from "@/lib/members";

export default async function MembersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?returnTo=/members");
  }

  const members = await getMembersPayload();

  return <MembersScreen currentUser={currentUser} members={members} />;
}
