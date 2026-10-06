import { useEffect } from "react";
import { BackButton } from "../components/ui/BackButton";
import LegalPage from "../components/legal/LegalPage";

export function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy · LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, []);

  return (
    <div className="shell-container py-10 md:py-14">
      <BackButton fallback="/" label="Back" className="mb-4" />
      <LegalPage
        eyebrow="LocalServe · Samundri"
        title="Privacy"
        updated="October 2026"
        intro="LocalServe helps people in Samundri, Pakistan find local service providers and request bookings. This page explains what information we collect and how it is used."
        sections={[
          {
            id: "what-we-collect",
            title: "What we collect",
            bullets: [
              "Account details: your name, email address and password (stored securely by our login provider), and the role you choose (customer or provider).",
              "Profile details: phone number (optional), your Samundri locality, and a short bio if you are a provider.",
              "Booking details: the service address, date and time, and notes you enter when you request a booking.",
              "Listings and reviews: the services, prices and photos providers publish, and the ratings and comments customers leave.",
            ],
          },
          {
            id: "how-we-use-it",
            title: "How we use it",
            paragraphs: [
              "We use this information to run the service: to show listings, send booking requests to providers, show notifications, and keep reviews and ratings accurate. We do not sell your personal information.",
            ],
          },
          {
            id: "who-can-see-your-information",
            title: "Who can see your information",
            bullets: [
              "Your name appears on your listings, reviews and booking requests.",
              "Your phone number is shared with the other person only after a booking is accepted.",
              "Listings, provider profiles, ratings and reviews are public.",
              "Administrators can view account and booking information when needed to run the service and handle reports.",
            ],
          },
          {
            id: "payments",
            title: "Payments",
            paragraphs: [
              "LocalServe does not process payments. Customers and providers agree on payment directly, so we do not collect card or bank details.",
            ],
          },
          {
            id: "where-your-data-is-stored",
            title: "Where your data is stored",
            paragraphs: [
              "Your data is stored with Supabase, our database and login provider. Listing cover photos you upload are stored there and are publicly visible.",
            ],
          },
          {
            id: "your-choices",
            title: "Your choices",
            paragraphs: [
              "You can edit your name, phone, locality and bio at any time from your Account page. To ask us to correct or delete your account information, email amna8mehmood@gmail.com.",
            ],
          },
          {
            id: "age",
            title: "Age",
            paragraphs: ["LocalServe is for people aged 18 and over."],
          },
          {
            id: "photo-credits",
            title: "Photo credits",
            paragraphs: ["Some photos on this site are from Pexels."],
          },
          {
            id: "changes",
            title: "Changes",
            paragraphs: [
              "We may update this page. The date at the top shows when it last changed.",
            ],
          },
          {
            id: "contact",
            title: "Contact",
            paragraphs: ["Questions about privacy:"],
          },
        ]}
        contactEmail="amna8mehmood@gmail.com"
      />
    </div>
  );
}
