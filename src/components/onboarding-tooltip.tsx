'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOnboardingStore, OnboardingStep } from '@/store/onboarding-store';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import { ChevronRight, X } from 'lucide-react';

// Bilingual messages
const messages = {
  en: {
    step1: 'This is your Main Goal. Everything starts here.',
    step2: 'Each Main Goal is supported by 8 Sub Goals.',
    step3: 'Click a Sub Goal to focus on it and see its activities.',
    step4: 'Break work into actionable activities.',
    step5: 'Use checklists for the smallest steps.',
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    next: 'Next',
    gotIt: 'Got it!',
    skip: 'Skip',
  },
  id: {
    step1: 'Ini adalah Tujuan Utama Anda. Semuanya dimulai dari sini.',
    step2: 'Setiap Tujuan Utama didukung oleh 8 Sub Tujuan.',
    step3: 'Klik Sub Tujuan untuk fokus dan melihat aktivitasnya.',
    step4: 'Pecah pekerjaan menjadi aktivitas yang dapat ditindaklanjuti.',
    step5: 'Gunakan checklist untuk langkah-langkah terkecil.',
    stepOf: (current: number, total: number) => `Langkah ${current} dari ${total}`,
    next: 'Lanjut',
    gotIt: 'Mengerti!',
    skip: 'Lewati',
  },
};

interface OnboardingTooltipProps {
  // Target element positions (passed from parent)
  mainGoalPosition?: { x: number; y: number };
  subGoalPosition?: { x: number; y: number };
  activityPosition?: { x: number; y: number };
  // Whether focus mode is active (for step 3)
  focusModeActive?: boolean;
  // Whether detail panel is open (for step 5)
  detailPanelOpen?: boolean;
}

export function OnboardingTooltip({
  mainGoalPosition,
  subGoalPosition,
  activityPosition,
  focusModeActive,
  detailPanelOpen,
}: OnboardingTooltipProps) {
  const { isActive, currentStep, nextStep, skipOnboarding, completed } = useOnboardingStore();
  const { language } = useUIStore();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const t = messages[language] || messages.en;

  // Calculate tooltip position based on current step
  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    let targetPos: { x: number; y: number } | undefined;
    
    switch (currentStep) {
      case 1:
        targetPos = mainGoalPosition;
        break;
      case 2:
        targetPos = subGoalPosition;
        break;
      case 3:
        targetPos = subGoalPosition;
        break;
      case 4:
        targetPos = activityPosition || subGoalPosition;
        break;
      case 5:
        // Position near the right side panel
        targetPos = { x: window.innerWidth - 250, y: 200 };
        break;
    }

    if (targetPos) {
      // Offset tooltip to appear below/beside the target
      setTooltipPosition({
        x: Math.min(Math.max(targetPos.x, 150), window.innerWidth - 300),
        y: targetPos.y + 80,
      });
      
      // Fade in with slight delay
      setTimeout(() => setIsVisible(true), 100);
    }
  }, [isActive, currentStep, mainGoalPosition, subGoalPosition, activityPosition]);

  // Auto-advance for certain steps based on user actions
  useEffect(() => {
    if (!isActive) return;

    // Step 3: Advance when focus mode is activated
    if (currentStep === 3 && focusModeActive) {
      setTimeout(() => nextStep(), 500);
    }

    // Step 5: Advance when detail panel is opened
    if (currentStep === 5 && detailPanelOpen) {
      // Don't auto-advance, let user click "Got it!"
    }
  }, [isActive, currentStep, focusModeActive, detailPanelOpen, nextStep]);

  const handleNext = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => nextStep(), 200);
  }, [nextStep]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => skipOnboarding(), 200);
  }, [skipOnboarding]);

  if (!isActive || completed) return null;

  const stepMessages: Record<OnboardingStep, string> = {
    1: t.step1,
    2: t.step2,
    3: t.step3,
    4: t.step4,
    5: t.step5,
  };

  const isLastStep = currentStep === 5;

  return (
    <>
      {/* Highlight glow effect on target element */}
      <OnboardingHighlight
        step={currentStep}
        mainGoalPosition={mainGoalPosition}
        subGoalPosition={subGoalPosition}
        activityPosition={activityPosition}
        isVisible={isVisible}
      />

      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-[100] pointer-events-auto",
          "transition-all duration-300 ease-out",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="relative bg-slate-800/95 backdrop-blur-md rounded-xl border border-blue-500/30 shadow-2xl shadow-blue-500/10 p-4 max-w-[280px]">
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800/95 border-l border-t border-blue-500/30 rotate-45" />
          
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-blue-400 font-medium">
              {t.stepOf(currentStep, 5)}
            </span>
            <button
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1"
              aria-label="Skip onboarding"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Message */}
          <p className="text-sm text-slate-200 leading-relaxed mb-3">
            {stepMessages[currentStep]}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t.skip}
            </button>
            <button
              onClick={handleNext}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-blue-600 hover:bg-blue-500 text-white",
                "transition-colors duration-150"
              )}
            >
              {isLastStep ? t.gotIt : t.next}
              {!isLastStep && <ChevronRight className="h-3 w-3" />}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                  step === currentStep ? "bg-blue-400" : "bg-slate-600"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Highlight component for the target element
function OnboardingHighlight({
  step,
  mainGoalPosition,
  subGoalPosition,
  activityPosition,
  isVisible,
}: {
  step: OnboardingStep;
  mainGoalPosition?: { x: number; y: number };
  subGoalPosition?: { x: number; y: number };
  activityPosition?: { x: number; y: number };
  isVisible: boolean;
}) {
  let position: { x: number; y: number } | undefined;
  let size = 120;

  switch (step) {
    case 1:
      position = mainGoalPosition;
      size = 200;
      break;
    case 2:
    case 3:
      position = subGoalPosition;
      size = 160;
      break;
    case 4:
      position = activityPosition || subGoalPosition;
      size = 120;
      break;
    case 5:
      // No highlight for checklist step (it's in the panel)
      return null;
  }

  if (!position) return null;

  return (
    <div
      className={cn(
        "fixed pointer-events-none z-[99]",
        "transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Pulsing glow ring */}
      <div
        className="rounded-full animate-pulse"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)',
        }}
      />
    </div>
  );
}
