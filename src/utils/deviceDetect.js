/**
 * Returns true when the current device is likely a phone.
 *
 * Uses UA string + pointer/hover media queries rather than viewport width so
 * this works correctly even when the app is displayed inside the desktop
 * PhoneFrame mockup (which renders at ~390 px wide on a laptop).
 *
 * This is only used to decide whether to skip the heavy ONNX segmentation
 * worker on mobile Safari — it does not need to be 100% exhaustive.
 */
export function isPhoneDevice() {
  const ua = navigator.userAgent || "";
  const mobileUA = /iPhone|Android.+Mobile|Mobile/i.test(ua);
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  return mobileUA || (coarsePointer && noHover);
}
