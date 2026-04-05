import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type TutorialStep = {
  key: string;
  route: string;
  icon: string;
  title: string;
  description: string;
  spotlight?: boolean;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    key: "calendars",
    route: "/(tabs)/calendars",
    icon: "home",
    title: "Your Calendar",
    description:
      "This is your personal space. Here you'll see all the events you've created and everything from the calendars you're subscribed to — all in one place.",
  },
  {
    key: "switch-calendar",
    route: "/(tabs)/switch-calendar",
    icon: "calendar",
    title: "Switch Calendar",
    description:
      "Use this to filter your view. See everything at once, or focus on a specific calendar you follow.",
  },
  {
    key: "search",
    route: "/(tabs)/search",
    icon: "search",
    title: "Search",
    description:
      "Discover public calendars, find other users, or look up specific events. Your gateway to the whole community.",
  },
  {
    key: "radar",
    route: "/radar",
    icon: "compass",
    title: "Radar",
    description:
      "Explore a live map of events happening near you. Tap any pin to see details and subscribe.",
  },
  {
    key: "create",
    icon: "add-circle",
    route: "",
    spotlight: true,
    title: "Create",
    description:
      "Tap the + button to create a new event, start a new calendar, or import an existing one.",
  },
];

export type ButtonLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TutorialContextType = {
  isActive: boolean;
  showWelcome: boolean;
  currentStep: number;
  steps: TutorialStep[];
  setShowWelcome: (v: boolean) => void;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTutorial: () => void;
  createButtonLayout: React.RefObject<ButtonLayout | null>;
};

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const createButtonLayout = useRef<ButtonLayout | null>(null);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setShowWelcome(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < TUTORIAL_STEPS.length - 1) return prev + 1;
      setIsActive(false);
      return 0;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        showWelcome,
        currentStep,
        steps: TUTORIAL_STEPS,
        setShowWelcome,
        startTutorial,
        nextStep,
        prevStep,
        endTutorial,
        createButtonLayout,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}