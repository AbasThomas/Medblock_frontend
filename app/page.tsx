import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { WhyExists } from "@/components/landing/WhyExists";
import { Solutions } from "@/components/landing/Solutions";
import { FeaturesByRole } from "@/components/landing/FeaturesByRole";
import { Process } from "@/components/landing/Process";
import { Order } from "@/components/landing/Order";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <Header />
      <Hero />
      <WhyExists />
      <Solutions />
      <FeaturesByRole />
      <Process />
      <Order />
      <FAQ />
      <Footer />
    </main>
  );
}
