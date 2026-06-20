"use client";

import { MotionConfig } from "framer-motion";

import { AvektoHeader } from "@/components/avekto/avekto-header";
import { AvektoHero } from "@/components/avekto/avekto-hero";
import { AvektoLifecycle } from "@/components/avekto/avekto-lifecycle";
import {
  AvektoIntake,
  AvektoProblem,
} from "@/components/avekto/avekto-problem-intake";
import {
  AvektoApart,
  AvektoGovernance,
} from "@/components/avekto/avekto-apart-governance";
import {
  AvektoFaq,
  AvektoTemplates,
} from "@/components/avekto/avekto-templates-faq";
import {
  AvektoCta,
  AvektoFooter,
} from "@/components/avekto/avekto-cta-footer";

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-white text-galaxy selection:bg-planetary selection:text-white">
        <AvektoHeader />
        <AvektoHero />
        <AvektoLifecycle />
        <AvektoProblem />
        <AvektoIntake />
        <AvektoApart />
        <AvektoGovernance />
        <AvektoTemplates />
        <AvektoFaq />
        <AvektoCta />
        <AvektoFooter />
      </main>
    </MotionConfig>
  );
}
