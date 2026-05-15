import { HeroSection } from "@/features/marketing/components/hero-section";
import { FeatureShowcase } from "@/features/marketing/components/feature-showcase";
import { GamificationShowcase } from "@/features/marketing/components/gamification-showcase";
import { SocialProofSection } from "@/features/marketing/components/social-proof-section";
import { AiShowcaseSection } from "@/features/marketing/components/ai-showcase-section";
import { FaqSection } from "@/features/marketing/components/faq-section";
import { CtaSection } from "@/features/marketing/components/cta-section";

export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <FeatureShowcase />
      <GamificationShowcase />
      <SocialProofSection />
      <AiShowcaseSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
