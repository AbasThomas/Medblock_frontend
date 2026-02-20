import { redirect } from "next/navigation";

export default function LoginShortcutPage() {
  redirect("/auth/login");
}
