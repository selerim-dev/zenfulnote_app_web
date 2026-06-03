import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "ZenfulNote terms and conditions for using the website and app.",
  alternates: {
    canonical: "/terms-and-conditions",
  },
};

const sections = [
  {
    title: "Using ZenfulNote",
    paragraphs: [
      "By using ZenfulNote, you agree to these terms and to any additional rules shown in the app or stores where the app is distributed.",
      "You are responsible for keeping your account credentials secure and for the content you create, upload, or share through the service.",
    ],
  },
  {
    title: "Health and wellness disclaimer",
    paragraphs: [
      "ZenfulNote is designed for journaling, reflection, and personal growth support. It is not a medical, mental health, emergency, diagnosis, or treatment service.",
      "If you may harm yourself or someone else, or if you are experiencing an emergency, call local emergency services or contact a crisis support resource immediately.",
    ],
  },
  {
    title: "Subscriptions and purchases",
    paragraphs: [
      "Paid features, trials, renewals, cancellations, refunds, and billing are handled through the applicable app store or payment provider.",
      "Subscription availability, pricing, and included features may change over time. Any changes will apply according to store policies and applicable law.",
    ],
  },
  {
    title: "Acceptable use",
    paragraphs: [
      "You may not misuse the service, interfere with its operation, attempt unauthorized access, reverse engineer restricted portions, or use ZenfulNote to violate laws or the rights of others.",
      "ZenfulNote may suspend or terminate access if use of the service creates risk, violates these terms, or harms other users or the service.",
    ],
  },
  {
    title: "Intellectual property",
    paragraphs: [
      "ZenfulNote, its branding, interface, content, software, and related materials are owned by ZenfulNote or its licensors.",
      "You retain rights to content you create, but you grant ZenfulNote the permissions needed to operate, store, process, display, and support that content within the service.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "The service is provided as available and without guarantees that it will always be uninterrupted, error-free, or meet every individual need.",
      "To the fullest extent allowed by law, ZenfulNote is not liable for indirect, incidental, special, consequential, or punitive damages related to use of the service.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `Questions about these terms can be sent to ${siteConfig.supportEmail}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <LegalDocument
        title="Terms and Conditions"
        updated="Last updated: December 2, 2023"
        intro="These terms govern access to and use of the ZenfulNote website, mobile app, and related services."
        sections={sections}
      />
      <SiteFooter />
    </div>
  );
}
