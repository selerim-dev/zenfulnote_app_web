"use client";

import { useEffect } from "react";
import { siteConfig } from "@/config/site";

export function DownloadRedirect() {
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform.toLowerCase();
    const isAndroid = userAgent.includes("android");
    const isIOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (platform.includes("mac") && window.navigator.maxTouchPoints > 1);

    const destination = isAndroid
      ? siteConfig.links.googlePlay
      : isIOS
        ? siteConfig.links.appStore
        : null;

    if (!destination) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      window.location.assign(destination);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
