import React, { useState } from "react";
import { Settings01Icon, Cancel01Icon } from "hugeicons-react";
import { useSettingsStore, type TextureQuality } from "../store/settingsStore";
import { Box, Slider } from "@mui/material";
import { textureLODHandler } from "../../materialsEngine/TextureLODHandler";
import { triggerQualityShiftPrewarm } from "../../assetPreloader/api/preload";

/**
 * SettingsPanel.tsx
 *
 * Full center-screen settings modal. Opened from the main toolbar menu button.
 * Matches the existing toolbar glass aesthetic (bg-background/90, backdrop-blur-2xl,
 * border-primary/10). No restart required — quality changes are live.
 *
 * Phase 2: Store wiring only. Visual quality change takes effect in Phase 3
 * when multi-resolution texture variants are generated and LOD selection is wired.
 */

type SettingsTab = "performance" | "display" | "audio";

const QUALITY_NODES: { value: TextureQuality; label: string; px: string }[] = [
  { value: "low",    label: "Low",    px: "512px" },
  { value: "medium", label: "Med",  px: "1K" },
  { value: "high",   label: "High",   px: "2K" },
  { value: "ultra",  label: "Ultra",  px: "4K" },
];

const SLIDER_MARKS = [
  { value: 0,  label: "512" },
  { value: 25, label: "1k" },
  { value: 50, label: "2k" },
  { value: 75, label: "4k" },
];

const qualityToValue = (q: TextureQuality): number => {
  switch (q) {
    case "medium": return 25;
    case "high": return 50;
    case "ultra": return 75;
    default: return 0;
  }
};

const valueToQuality = (v: number): TextureQuality => {
  if (v >= 75) return "ultra";
  if (v >= 50) return "high";
  if (v >= 25) return "medium";
  return "low";
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("performance");
  const { textureQuality, setTextureQuality } = useSettingsStore();

  if (!isOpen) return null;

  const handleQualityChange = (val: number) => {
    const newQuality = valueToQuality(val);
    setTextureQuality(newQuality);
    textureLODHandler.clearCache();
    triggerQualityShiftPrewarm();
  };

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicking the panel itself doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "520px",
          background: "var(--background)",
          border: "1px solid rgba(var(--primary-rgb, 99 102 241) / 0.12)",
          borderRadius: "1.5rem",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
          backdropFilter: "blur(40px)",
          padding: "0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <Settings01Icon size={18} style={{ opacity: 0.6 }} />
            <span style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.9,
            }}>Settings</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "0.25rem",
              cursor: "pointer",
              color: "var(--text)",
              opacity: 0.4,
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
          >
            <Cancel01Icon size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "0.25rem",
          padding: "0.75rem 1.5rem 0",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {(["performance", "display", "audio"] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "var(--background)" : "var(--text)",
                opacity: activeTab === tab ? 1 : 0.45,
                border: "none",
                borderRadius: "0.5rem 0.5rem 0 0",
                padding: "0.4rem 0.875rem",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "-1px",
                borderBottom: activeTab === tab ? "1px solid var(--primary)" : "1px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "1.5rem" }}>

          {/* ── PERFORMANCE TAB ── */}
          {activeTab === "performance" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, opacity: 0.9 }}>Texture Quality</span>
                  {/* Live badge */}
                  <span style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "0.15rem 0.5rem",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "999px",
                    opacity: 0.5,
                  }}>
                    No Restart Required
                  </span>
                </div>
                <p style={{ fontSize: "0.7rem", opacity: 0.45, lineHeight: 1.6, margin: 0 }}>
                  Controls the maximum resolution of building surface textures.
                  Lower settings significantly improve performance on slower hardware
                  and reduce VRAM usage.
                </p>
              </div>

              {/* MUI Discrete Slider */}
              <Box sx={{ px: 1.5, py: 2 }}>
                <Slider
                  aria-label="Texture Resolution"
                  value={qualityToValue(textureQuality)}
                  onChange={(_, val) => handleQualityChange(val as number)}
                  step={25}
                  marks={SLIDER_MARKS}
                  min={0}
                  max={75}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => SLIDER_MARKS.find(m => m.value === v)?.label || ""}
                  sx={{
                    color: "var(--primary)",
                    height: 4,
                    "& .MuiSlider-track": {
                      border: "none",
                      boxShadow: "0 0 8px var(--primary)",
                    },
                    "& .MuiSlider-thumb": {
                      height: 18,
                      width: 18,
                      backgroundColor: "var(--background)",
                      border: "2px solid currentColor",
                      boxShadow: "0 0 12px var(--primary)",
                      "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
                        boxShadow: "0 0 20px var(--primary)",
                      },
                      "&:before": {
                        display: "none",
                      },
                    },
                    "& .MuiSlider-valueLabel": {
                      lineHeight: 1.2,
                      fontSize: "0.7rem",
                      background: "unset",
                      padding: 0,
                      width: 32,
                      height: 32,
                      borderRadius: "50% 50% 50% 0",
                      backgroundColor: "var(--primary)",
                      transformOrigin: "bottom left",
                      transform: "translate(50%, -100%) rotate(-45deg) scale(0)",
                      "&:before": { display: "none" },
                      "&.MuiSlider-valueLabelOpen": {
                        transform: "translate(50%, -100%) rotate(-45deg) scale(1)",
                      },
                      "& > *": {
                        transform: "rotate(45deg)",
                        color: "var(--background)",
                        fontWeight: 800,
                      },
                    },
                    "& .MuiSlider-mark": {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      height: 8,
                      width: 1,
                      "&.MuiSlider-markActive": {
                        opacity: 1,
                        backgroundColor: "currentColor",
                      },
                    },
                    "& .MuiSlider-markLabel": {
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      opacity: 0.4,
                      color: "var(--text)",
                      mt: 0.5,
                      "&[data-index='0'], &[data-index='1'], &[data-index='2'], &[data-index='3']": {
                        opacity: 1,
                      },
                      "&.MuiSlider-markLabelActive": {
                        color: "var(--primary)",
                        opacity: 1,
                      }
                    },
                    "& .MuiSlider-rail": {
                      opacity: 0.1,
                      backgroundColor: "var(--text)",
                    },
                  }}
                />
              </Box>

              {/* Current value indicator */}
              <div style={{
                marginTop: "0.5rem",
                padding: "0.625rem 0.875rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: "0.65rem", opacity: 0.45 }}>Active Quality</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    boxShadow: "0 0 8px var(--primary)",
                  }} />
                  <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    {QUALITY_NODES.find(n => n.value === textureQuality)?.label} — {QUALITY_NODES.find(n => n.value === textureQuality)?.px}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── DISPLAY TAB ── */}
          {activeTab === "display" && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "2rem 0",
              opacity: 0.35,
            }}>
              <span style={{ fontSize: "1.5rem" }}>🖥</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Display Settings
              </span>
              <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>Coming Soon</span>
            </div>
          )}

          {/* ── AUDIO TAB ── */}
          {activeTab === "audio" && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "2rem 0",
              opacity: 0.35,
            }}>
              <span style={{ fontSize: "1.5rem" }}>🔊</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Audio Settings
              </span>
              <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>Coming Soon</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
