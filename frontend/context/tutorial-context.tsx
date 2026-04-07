import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

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

const STORAGE_KEY_ACTIVE = "tutorial_is_active";
const STORAGE_KEY_STEP   = "tutorial_current_step";

function loadFromStorage(): { isActive: boolean; currentStep: number } {
  try {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const step   = localStorage.getItem(STORAGE_KEY_STEP);
    return {
      isActive:    active === "true",
      currentStep: step ? parseInt(step, 10) : 0,
    };
  } catch {
    return { isActive: false, currentStep: 0 };
  }
}

function saveToStorage(isActive: boolean, currentStep: number) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE,  String(isActive));
    localStorage.setItem(STORAGE_KEY_STEP,    String(currentStep));
  } catch {
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    localStorage.removeItem(STORAGE_KEY_STEP);
  } catch {}
}

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
  createButtonLayout: React.MutableRefObject<ButtonLayout | null>;
};

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const saved = loadFromStorage();

  const [isActive,     setIsActive]     = useState(saved.isActive);
  const [showWelcome,  setShowWelcome]  = useState(false);
  const [currentStep,  setCurrentStep]  = useState(saved.currentStep);
  const createButtonLayout = useRef<ButtonLayout | null>(null);

  useEffect(() => {
    saveToStorage(isActive, currentStep);
  }, [isActive, currentStep]);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setShowWelcome(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next < TUTORIAL_STEPS.length) return next;
      // Last step done — end tutorial and clear storage
      setIsActive(false);
      clearStorage();
      return 0;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    clearStorage();
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