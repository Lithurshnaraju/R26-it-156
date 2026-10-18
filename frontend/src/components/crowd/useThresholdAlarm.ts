import { useEffect, useRef, useState } from "react";
import { Alarm } from "@/crowd/alarm";

/**
 * Watches `count` against a user-adjustable `threshold` and drives an
 * audible alarm while count > threshold. The alarm can be manually
 * stopped (muted) at any time; it automatically re-arms once the count
 * drops back to/under the threshold, so the next crossing sounds again.
 */
export function useThresholdAlarm(count: number | null, initialThreshold: number) {
  const [threshold, setThreshold] = useState(initialThreshold);
  const [muted, setMuted] = useState(false);
  const alarmRef = useRef<Alarm | null>(null);
  const initializedRef = useRef(false);

  // Adopt the backend's configured threshold as the default once it's
  // known, but only before the user has had a chance to override it.
  useEffect(() => {
    if (!initializedRef.current) {
      setThreshold(initialThreshold);
      initializedRef.current = true;
    }
  }, [initialThreshold]);

  useEffect(() => {
    alarmRef.current = new Alarm();
    return () => alarmRef.current?.stop();
  }, []);

  const exceeded = count !== null && count > threshold;

  useEffect(() => {
    if (!alarmRef.current) return;
    if (exceeded && !muted) {
      alarmRef.current.start();
    } else {
      alarmRef.current.stop();
    }
  }, [exceeded, muted]);

  // Re-arm: once back under threshold, clear any manual mute so the
  // alarm will sound again on the next crossing.
  useEffect(() => {
    if (!exceeded && muted) setMuted(false);
  }, [exceeded, muted]);

  return {
    threshold,
    setThreshold,
    exceeded,
    muted,
    stopAlarm: () => setMuted(true),
  };
}
