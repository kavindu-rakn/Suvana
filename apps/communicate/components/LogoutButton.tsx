"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { BASE_PATH } from "@/lib/basePath";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: BASE_PATH || "/" })}
      className={buttonVariants("ghost", "md")}
    >
      <LogOut size={16} />
      Log out
    </button>
  );
}
