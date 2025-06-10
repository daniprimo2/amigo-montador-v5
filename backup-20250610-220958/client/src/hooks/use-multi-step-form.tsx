import { useState } from "react";

export function useMultiStepForm(steps: number) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  function next() {
    setCurrentStepIndex(i => {
      if (i >= steps - 1) return i;
      return i + 1;
    });
  }

  function back() {
    setCurrentStepIndex(i => {
      if (i <= 0) return i;
      return i - 1;
    });
  }

  function goTo(index: number) {
    setCurrentStepIndex(index);
  }

  return {
    currentStepIndex,
    step: currentStepIndex + 1,
    steps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps - 1,
    goTo,
    next,
    back,
  };
}
