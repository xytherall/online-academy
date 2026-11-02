import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(public)/login/actions";

/** Icon only on phones (to keep the portal header on one line), labelled from sm up. */
export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm" aria-label="Sign out">
        <LogOutIcon aria-hidden className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
