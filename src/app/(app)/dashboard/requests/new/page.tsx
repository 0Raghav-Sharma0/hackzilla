import { redirect } from "next/navigation";

export default function NewRequestPage() {
  redirect("/dashboard/requests?compose=1");
}
