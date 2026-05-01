import { cookies } from "next/headers";
import { decodeSessionUser, SESSION_USER_COOKIE_NAME } from "@/lib/auth";
import LaunchesClientPage from "./LaunchesClientPage";

export default function LaunchesPage() {
  const cookieStore = cookies();
  const rawUserCookie = cookieStore.get(SESSION_USER_COOKIE_NAME)?.value || null;
  const sessionUser = decodeSessionUser(rawUserCookie);

  return <LaunchesClientPage initialSessionUser={sessionUser} />;
}
