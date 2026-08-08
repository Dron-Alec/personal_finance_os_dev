import { redirect } from "next/navigation";

// Middleware guarantees only fully authenticated, MFA-satisfied users ever
// reach this route — send them to their default tab.
export default function Home() {
  redirect("/data-entry");
}
