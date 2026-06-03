import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZenfulNote privacy policy and data handling overview.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const sections = [
  {
    title: "Information we collect",
    paragraphs: [
      "ZenfulNote may collect account information, contact details, subscription status, device details, usage data, app interactions, and content you choose to create in the app.",
      "Journal entries, check-ins, trigger logs, glimmer logs, notes, and similar reflections are provided by you. You should avoid adding information you do not want stored in the service.",
    ],
  },
  {
    title: "How information is used",
    paragraphs: [
      "Information is used to provide the app experience, sync content, personalize features, process subscriptions, improve reliability, respond to support requests, and protect the service from misuse.",
      "ZenfulNote may use analytics and diagnostic tools to understand performance, crashes, feature usage, and onboarding flows.",
    ],
  },
  {
    title: "Sharing and service providers",
    paragraphs: [
      "ZenfulNote may work with vendors for hosting, analytics, authentication, payments, subscriptions, notifications, customer support, and similar operational needs.",
      "Information may also be disclosed if required by law, to protect rights and safety, or as part of a business transfer such as a merger or acquisition.",
    ],
  },
  {
    title: "Your choices",
    paragraphs: [
      "You may update account information in the app, manage subscriptions through the relevant app store, and contact support for questions about your data.",
      "Device settings may let you manage notifications, tracking permissions, and other platform-level privacy choices.",
    ],
  },
  {
    title: "Data security and retention",
    paragraphs: [
      "ZenfulNote uses reasonable technical and organizational measures to protect information, but no online service can guarantee absolute security.",
      "Information may be retained for as long as needed to provide the service, comply with legal obligations, resolve disputes, and maintain business records.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      `For privacy questions or requests, contact ${siteConfig.supportEmail}.`,
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <SiteHeader />
      <LegalDocument
        title="Privacy Policy"
        updated="Effective date: December 2, 2023"
        intro="This policy describes how ZenfulNote collects, uses, and shares information when you use the website, mobile app, and related services."
        sections={sections}
      />
      <SiteFooter />
    </div>
  );
}
