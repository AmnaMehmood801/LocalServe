import { Outlet } from "react-router-dom";

import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { ScrollToTop } from "../components/ScrollToTop";

export function PublicLayout() {
  return (
    <div className="home-marketplace flex min-h-screen flex-col bg-[#F7F8F7] text-ink">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
