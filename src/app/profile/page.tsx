import { redirect } from "next/navigation";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?returnTo=/profile");
  }

  return <ProfileScreen currentUser={currentUser} />;
}
