"use client";

import { usePathname, useRouter } from "next/navigation";

type FallbackTarget = {
  href: string;
  label: string;
};

function resolveFallbackTarget(pathname: string): FallbackTarget {
  if (pathname.startsWith("/operations/") && pathname.includes("/contacts")) {
    const operationPath = pathname.split("/contacts")[0];
    return {
      href: operationPath,
      label: "Operasyona don",
    };
  }

  if (pathname.startsWith("/operations/")) {
    return {
      href: "/operations",
      label: "Operasyonlara don",
    };
  }

  if (pathname.startsWith("/surveys/")) {
    return {
      href: "/surveys",
      label: "Anketlere don",
    };
  }

  if (pathname.startsWith("/contacts")) {
    return {
      href: "/",
      label: "Panele don",
    };
  }

  if (pathname.startsWith("/analytics")) {
    return {
      href: "/",
      label: "Panele don",
    };
  }

  if (pathname.startsWith("/calling-ops")) {
    return {
      href: "/",
      label: "Panele don",
    };
  }

  return {
    href: "/",
    label: "Geri don",
  };
}

export function PageBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname) {
    return null;
  }

  const fallbackTarget = resolveFallbackTarget(pathname);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackTarget.href);
  }

  return (
    <button type="button" className="button-secondary compact-button page-back-button" onClick={handleBack}>
      {fallbackTarget.label}
    </button>
  );
}
