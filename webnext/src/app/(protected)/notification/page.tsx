import NotificationItem from "@/features/notification/components/NotificationHome";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Page() {

  return <NotificationItem />;
}