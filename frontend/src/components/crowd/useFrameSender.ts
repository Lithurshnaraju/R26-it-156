import { useRef } from "react";

export function useFrameSender(watchdogMs = 2000) {
  const readyRef = useRef(true);
  const lastSentAtRef = useRef(0);

  const canSend = () => {
    if (readyRef.current) return true;
    // Backend response was lost or is unusually slow — don't stall forever.
    return performance.now() - lastSentAtRef.current > watchdogMs;
  };

  const markSent = () => {
    readyRef.current = false;
    lastSentAtRef.current = performance.now();
  };

  const markReceived = () => {
    readyRef.current = true;
  };

  const reset = () => {
    readyRef.current = true;
    lastSentAtRef.current = 0;
  };

  return { canSend, markSent, markReceived, reset };
}
