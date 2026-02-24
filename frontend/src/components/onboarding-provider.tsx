"use client";

import { useState, useEffect } from "react";
import OnboardingFlow from "@/components/onboarding-flow";

const API_BASE_URL = "http://localhost:8000";

/**
 * Provider that checks onboarding status once on mount.
 * Shows the OnboardingFlow overlay if not completed.
 * Renders children normally once onboarding is done.
 */
export default function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/onboarding/status`);
      if (response.ok) {
        const data = await response.json();
        setNeedsOnboarding(!data.completed);
      } else {
        // If backend is unreachable, don't block the app
        setNeedsOnboarding(false);
      }
    } catch {
      // Backend down — skip onboarding check gracefully
      setNeedsOnboarding(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  // Show nothing while checking status to avoid a flash
  if (isChecking) return null;

  return (
    <>
      {needsOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {children}
    </>
  );
}
