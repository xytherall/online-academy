import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(public)/login/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        Sign out
      </Button>
    </form>
  );
}
