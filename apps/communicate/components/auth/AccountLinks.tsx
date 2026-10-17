"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { accountLink } from "@/lib/accountPaths";
import { BASE_PATH } from "@/lib/basePath";
import { buttonVariants } from "@/components/ui/Button";

/** Plain anchors reach the Shell root without Next adding /communicate. */
export function AccountLinks() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const callbackUrl = `${BASE_PATH}${pathname}${query ? `?${query}` : ""}`;
  return <>
    <a href={accountLink("login", callbackUrl)} className={buttonVariants("ghost", "md")}>Log in</a>
    <a href={accountLink("register", callbackUrl)} className={buttonVariants("primary", "md")}>Sign up</a>
  </>;
}
