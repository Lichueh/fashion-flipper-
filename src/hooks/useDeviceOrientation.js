import { useEffect, useState, useCallback } from "react";

// Wraps DeviceOrientationEvent with iOS 13+ permission flow.
// On desktop / unsupported / denied, orientation stays at all-zero,
// which the consumer treats as "no compensation".
export default function useDeviceOrientation() {
  const [orientation, setOrientation] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0,
  });
  const [permission, setPermission] = useState(() => {
    if (typeof window === "undefined") return "unsupported";
    if (typeof DeviceOrientationEvent === "undefined") return "unsupported";
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      return "needs-request";
    }
    return "granted";
  });

  useEffect(() => {
    if (permission !== "granted") return;
    const handler = (e) => {
      setOrientation({
        alpha: e.alpha ?? 0,
        beta: e.beta ?? 0,
        gamma: e.gamma ?? 0,
      });
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [permission]);

  // Must be called from a user gesture handler on iOS Safari.
  const requestPermission = useCallback(async () => {
    if (permission === "granted") return true;
    if (permission === "unsupported") return false;
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      setPermission(r === "granted" ? "granted" : "denied");
      return r === "granted";
    } catch {
      setPermission("denied");
      return false;
    }
  }, [permission]);

  return { orientation, permission, requestPermission };
}
