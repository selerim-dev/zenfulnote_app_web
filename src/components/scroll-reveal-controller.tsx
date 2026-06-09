"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelector = [
  ".hero-copy-reveal",
  ".product-deck-stage",
  ".actual-app-phone",
  ".proof-ribbon",
  ".proof-tab-reveal",
  ".reveal-on-scroll",
  ".pop-on-scroll",
  ".review-carousel article",
  "[data-scroll-reveal]",
].join(",");

export function ScrollRevealController() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(revealSelector),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    elements.forEach((element) => {
      element.classList.add("scroll-reveal-target");

      if (element.style.animationDelay) {
        element.style.setProperty("--reveal-delay", element.style.animationDelay);
      }
    });

    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return () => {
        elements.forEach((element) => {
          element.classList.remove("scroll-reveal-target", "is-visible");
          element.style.removeProperty("--reveal-delay");
        });
      };
    }

    document.documentElement.classList.add("scroll-reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.14,
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove("scroll-reveal-target", "is-visible");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, [pathname]);

  return null;
}
