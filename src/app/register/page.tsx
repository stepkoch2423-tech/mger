import { redirect } from "next/navigation";
import { RegisterScreen } from "@/components/auth/register-screen";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/");
  }

  return <RegisterScreen />;
}
