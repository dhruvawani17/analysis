"use client";

import { VideoBackground } from "@/components/landing/VideoBackground";
import { LandingNavbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { WhyChoose } from "@/components/landing/WhyChoose";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050608] text-[#F8FAFC] overflow-hidden" style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <VideoBackground />
      <LandingNavbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <InteractiveDemo />
        <WhyChoose />
        <Testimonials />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
