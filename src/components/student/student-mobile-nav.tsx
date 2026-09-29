"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentNavLinks } from "@/components/student/student-nav-links";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function StudentMobileNav() {
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
          <SheetTitle>Student portal</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <StudentNavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
