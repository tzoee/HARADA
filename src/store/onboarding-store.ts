import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingState {
  // Whether onboarding has been completed or skipped
  completed: boolean;
  // Current step (1-5)
  currentStep: OnboardingStep;
  // Whether onboarding is currently active
  isActive: boolean;
  
  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completed: false,
      currentStep: 1,
      isActive: false,

      startOnboarding: () => {
        if (!get().completed) {
          set({ isActive: true, currentStep: 1 });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 5) {
          set({ currentStep: (currentStep + 1) as OnboardingStep });
        } else {
          // Complete onboarding after step 5
          set({ completed: true, isActive: false });
        }
      },

      skipOnboarding: () => {
        set({ completed: true, isActive: false });
      },

      completeOnboarding: () => {
        set({ completed: true, isActive: false });
      },

      resetOnboarding: () => {
        set({ completed: false, currentStep: 1, isActive: false });
      },
    }),
    {
      name: 'harada-onboarding',
      partialize: (state) => ({
        completed: state.completed,
      }),
    }
  )
);
