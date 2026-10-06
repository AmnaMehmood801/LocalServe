import { useEffect } from "react";
import { BackButton } from "../components/ui/BackButton";
import LegalPage from "../components/legal/LegalPage";

export function TermsPage() {
  useEffect(() => {
    document.title = "Terms · LocalServe";
    return () => {
      document.title = "LocalServe";
    };
  }, []);

  return (
    <div className="shell-container py-10 md:py-14">
      <BackButton fallback="/" label="Back" className="mb-4" />
      <LegalPage
        eyebrow="LocalServe · Samundri"
        title="Terms"
        updated="October 2026"
        intro="These terms explain how LocalServe works. By creating an account or using the site you agree to them."
        sections={[
          {
            id: "what-localserve-is",
            title: "What LocalServe is",
            paragraphs: [
              "LocalServe is a marketplace that helps customers in Samundri, Pakistan find local service providers and request bookings. LocalServe does not provide the services itself. Providers are independent people or businesses.",
            ],
          },
          {
            id: "accounts",
            title: "Accounts",
            bullets: [
              "You must be 18 or older to use LocalServe.",
              "Give accurate information and keep your password private.",
              "You are responsible for what happens under your account.",
              "A provider account can also be used as a customer account.",
            ],
          },
          {
            id: "bookings",
            title: "Bookings",
            bullets: [
              "A booking request is not confirmed until the provider accepts it.",
              "Providers may accept or decline a request. Customers and providers may cancel before the job is completed.",
              "Once a booking is accepted, phone numbers are shared so you can arrange the visit.",
              "After the job, both sides mark it complete and the customer can leave a review.",
            ],
          },
          {
            id: "prices-and-payment",
            title: "Prices and payment",
            paragraphs: [
              "LocalServe does not process payments. The price shown on a listing is a guide set by the provider. The final price and how it is paid are agreed directly between the customer and the provider.",
            ],
          },
          {
            id: "listings-and-reviews",
            title: "Listings and reviews",
            bullets: [
              "Providers must describe their services and prices honestly and only post photos they have the right to use.",
              "Reviews must be honest and based on a real booking. No abuse, threats or false claims.",
              "We may hide or remove listings, reviews or accounts that break these terms.",
            ],
          },
          {
            id: "acceptable-use",
            title: "Acceptable use",
            paragraphs: [
              "Do not use LocalServe to break the law, harass others, post false or misleading content, or try to access other people's accounts or data.",
            ],
          },
          {
            id: "our-responsibility",
            title: "Our responsibility",
            paragraphs: [
              "We try to keep LocalServe working and accurate, but we cannot guarantee the quality, safety or timing of services offered by providers. Please use your own judgment, and meet in safe conditions.",
            ],
          },
          {
            id: "reports-and-problems",
            title: "Reports and problems",
            paragraphs: [
              "If you see a problem with a listing, review or user, email us and we will look into it.",
            ],
          },
          {
            id: "changes",
            title: "Changes",
            paragraphs: [
              "We may update these terms. The date at the top shows when they last changed. Continuing to use LocalServe means you accept the updated terms.",
            ],
          },
          {
            id: "contact",
            title: "Contact",
            paragraphs: ["Questions about these terms:"],
          },
        ]}
        contactEmail="amna8mehmood@gmail.com"
      />
    </div>
  );
}
