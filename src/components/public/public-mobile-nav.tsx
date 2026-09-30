"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavLinks } from "@/components/public/public-nav-links";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden">
            <MenuIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        }
      />
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <PublicNavLinks
            className="flex flex-col gap-1"
            linkClassName="rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground"
            onNavigate={() => setOpen(false)}
          />
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Button render={<Link href="/apply" onClick={() => setOpen(false)} />} nativeButton={false}>
              Apply now
            </Button>
            <Button
              variant="outline"
              render={<Link href="/login" onClick={() => setOpen(false)} />}
              nativeButton={false}
            >
              Student login
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
