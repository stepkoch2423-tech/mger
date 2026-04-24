import { EventsBoardApp } from "@/components/home/events-board-app";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPayload } from "@/lib/dashboard";

export default async function Home() {
  const currentUser = await getCurrentUser();
  const board = await getBoardPayload(currentUser);

  return <EventsBoardApp board={board} currentUser={currentUser} />;
}
