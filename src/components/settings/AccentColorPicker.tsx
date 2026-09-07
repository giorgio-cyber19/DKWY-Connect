"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { DEFAULT_ACCENT, deriveAccentPalette, hexToHsl, hslToHex, isValidHexColor } from "@/lib/accent-color";

const WHEEL_SIZE = 168;

function applyLivePreview(hex: string) {
  const { base, light, deep } = deriveAccentPalette(hex);
  const root = document.documentElement.style;
  root.setProperty("--color-blue", base);
  root.setProperty("--color-blue-light", light);
  root.setProperty("--color-blue-deep", deep);
}

/**
 * A hue/saturation color wheel (angle = hue, distance from center = saturation) plus a
 * lightness slider — a teacher's whole custom accent is derived from this one picked color.
 * Dragging previews live across the entire app immediately; the parent Settings page only
 * persists it to the account when the page's Save button is clicked.
 */
export function AccentColorPicker({ value, onChange }: { value: string | null; onChange: (hex: string | null) => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const initial = hexToHsl(value ?? DEFAULT_ACCENT);
  const [hue, setHue] = useState(initial.h);
  const [saturation, setSaturation] = useState(initial.s);
  const [lightness, setLightness] = useState(Math.min(Math.max(initial.l, 25), 70));
  const [hexInput, setHexInput] = useState((value ?? DEFAULT_ACCENT).toLowerCase());
  const wheelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const hex = hslToHex(hue, saturation, lightness);

  useEffect(() => {
    setHexInput(hex);
    applyLivePreview(hex);
    onChange(hex.toLowerCase() === DEFAULT_ACCENT ? null : hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  // Leaving the page without saving shouldn't leave the whole app tinted by an unsaved draft.
  useEffect(() => {
    const persisted = user?.accentColor;
    return () => {
      if (persisted) applyLivePreview(persisted);
      else {
        const root = document.documentElement.style;
        root.removeProperty("--color-blue");
        root.removeProperty("--color-blue-light");
        root.removeProperty("--color-blue-deep");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = clientX - (rect.left + radius);
    const dy = clientY - (rect.top + radius);
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    setHue(angle);
    setSaturation((dist / radius) * 100);
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      updateFromPointer(e.clientX, e.clientY);
    }
    function onUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromPointer]);

  function handlePointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    updateFromPointer(e.clientX, e.clientY);
  }

  function reset() {
    const { h, s, l } = hexToHsl(DEFAULT_ACCENT);
    setHue(h);
    setSaturation(s);
    setLightness(l);
  }

  function handleHexInput(raw: string) {
    setHexInput(raw);
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidHexColor(candidate)) {
      const { h, s, l } = hexToHsl(candidate);
      setHue(h);
      setSaturation(s);
      setLightness(Math.min(Math.max(l, 15), 80));
    }
  }

  const markerAngleRad = (hue * Math.PI) / 180;
  const markerRadius = (saturation / 100) * (WHEEL_SIZE / 2);
  const markerX = WHEEL_SIZE / 2 + markerRadius * Math.cos(markerAngleRad);
  const markerY = WHEEL_SIZE / 2 + markerRadius * Math.sin(markerAngleRad);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-label={t("settings.accentColorWheelLabel")}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        aria-valuetext={hex}
        tabIndex={0}
        className="relative shrink-0 rounded-full cursor-pointer touch-none select-none focus-ring"
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          background:
            "radial-gradient(circle, white 0%, transparent 100%), conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
        }}
      >
        <span
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)] pointer-events-none"
          style={{ left: markerX, top: markerY, transform: "translate(-50%, -50%)", background: hex }}
        />
      </div>

      <div className="flex-1 w-full min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl shrink-0 border border-[var(--border-soft)]" style={{ background: hex }} />
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">{t("settings.accentColorHexLabel")}</label>
            <input
              value={hexInput}
              onChange={(e) => handleHexInput(e.target.value)}
              spellCheck={false}
              maxLength={7}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border-soft)] bg-transparent focus-ring focus:border-[var(--color-gold)] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">{t("settings.accentColorLightnessLabel")}</label>
          <input
            type="range"
            min={15}
            max={80}
            value={lightness}
            onChange={(e) => setLightness(Number(e.target.value))}
            style={{ accentColor: hex }}
            className="w-full"
          />
        </div>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <RotateCcw size={13} /> {t("settings.accentColorResetButton")}
        </button>
      </div>
    </div>
  );
}
