"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={buttonVariants("ghost", "md")}
    >
      <LogOut size={16} />
      Log out
    </button>
  );
}
