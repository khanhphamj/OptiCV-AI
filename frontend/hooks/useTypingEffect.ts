import { useState, useEffect } from 'react';

interface TypingEffectOptions {
  typingSpeed?: number;
  pauseDuration?: number;
}

export interface TypingEffectState {
  text: string;
  stepIndex: number;
  totalSteps: number;
}

export const useTypingEffect = (
  steps: string[],
  options: TypingEffectOptions = {}
): TypingEffectState => {
  const { typingSpeed = 50, pauseDuration = 1500 } = options;
  const [stepIndex, setStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setStepIndex(0);
    setDisplayedText('');
    setIsPaused(false);
  }, [steps]);

  useEffect(() => {
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setStepIndex((prev) => (prev + 1) % steps.length);
        setDisplayedText('');
        setIsPaused(false);
      }, pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    const currentStepText = steps[stepIndex];
    if (currentStepText && displayedText.length < currentStepText.length) {
      const typingTimer = setTimeout(() => {
        setDisplayedText(currentStepText.substring(0, displayedText.length + 1));
      }, typingSpeed);
      return () => clearTimeout(typingTimer);
    } else if (currentStepText) {
      setIsPaused(true);
    }
  }, [displayedText, stepIndex, steps, isPaused, typingSpeed, pauseDuration]);

  return { text: displayedText, stepIndex, totalSteps: steps.length };
};
