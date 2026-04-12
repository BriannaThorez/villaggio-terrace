import { useEffect } from "react";
import { SimulationCanvas } from "./widgets/SimulationCanvas";
import { MainToolbar } from "./features/ui/toolbars/MainToolbar";
import { BuildToolbar } from "./features/ui/toolbars/BuildToolbar";

import { ControlsHint } from "./features/ui/hud/ControlsHint";
import { CameraReadout } from "./features/ui/hud/CameraReadout";
import { SelectionPanel } from "./features/ui/panels/SelectionPanel";
import { Minimap } from "./features/ui/panels/Minimap";
import { WeatherPanel } from "./features/weather/ui/WeatherPanel";
import { useSimulationStore } from "./shared/utils";
import { getThemePalette, getThemeMode } from "./features/ui/themes/themes";

export default function App() {
  const setActiveTool = useSimulationStore((state) => state.setActiveTool);
  const undo = useSimulationStore((state) => state.undo);
  const redo = useSimulationStore((state) => state.redo);
  const resetCamera = useSimulationStore((state) => state.resetCamera);
  const editingId = useSimulationStore((state) => state.editingId);
  const setEditingId = useSimulationStore((state) => state.setEditingId);
  const setSelectedId = useSimulationStore((state) => state.setSelectedId);
  const selectedId = useSimulationStore((state) => state.selectedId);
  const showControls = useSimulationStore((state) => state.showControls);
  const themeName = useSimulationStore((state) => state.themeName);
  const shapes = useSimulationStore((state) => state.shapes);
  const updateShape = useSimulationStore((state) => state.updateShape);
  const showMinimap = useSimulationStore((state) => state.showMinimap);
  const editingShape = shapes.find((s) => s.id === editingId);

  useEffect(() => {
    // Telemetry is intentionally feature-sliced and isolated from the core app.
    // The app should not directly depend on telemetry lifecycle for rendering.
  }, []);

  useEffect(() => {
    const palette = getThemePalette(themeName);
    const mode = getThemeMode(themeName);
    const root = document.documentElement;

    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--secondary", palette.secondary);
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--neutral-light", palette.neutralLight);
    root.style.setProperty("--neutral-dark", palette.neutralDark);

    const background =
      mode === "dark" ? palette.neutralDark : palette.neutralLight;
    const text = mode === "dark" ? palette.neutralLight : palette.neutralDark;

    root.style.setProperty("--background", background);
    root.style.setProperty("--text", text);
    root.style.setProperty("--highlight", palette.accent);

    // Extract RGB for all colors for shadows/transparency
    // Set the color-scheme property for browser UI
    root.style.setProperty("color-scheme", mode);
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if we're editing text
      if (editingId) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo/Redo
      if (ctrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === "z") {
        undo();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === "y") {
        redo();
        return;
      }

      // Deselect all / Reset tool
      if (e.key === "Escape") {
        setActiveTool("select");
        setSelectedId(null);
        setEditingId(null);
        return;
      }

      // Center camera
      if (e.key === " ") {
        e.preventDefault();
        resetCamera();
        return;
      }

      // Zoom (handled in canvas but we can trigger it here if needed)
      // For now, let's assume OrbitControls handles +/- if we enable it,
      // but we'll implement custom zoom logic in canvas.

      // Tool mapping
      const toolMap: Record<string, string> = {
        "1": "select",
        "2": "text",
        "3": "box",
        "4": "diamond",
        "5": "circle",
        "6": "parallelogram",
        "7": "cylinder",
        "8": "document",
        "9": "hexagon",
        "0": "trapezoid",
        t: "terminal",
        p: "predefined_process",
        s: "internal_storage",
        i: "manual_input",
        d: "display",
        o: "or",
        u: "summing_junction",
        c: "off_page_connector",
        v: "vertex",
        l: "link",
      };

      const key = e.key.toLowerCase();
      if (toolMap[key]) {
        setActiveTool(toolMap[key] as any);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editingId,
    undo,
    redo,
    resetCamera,
    setActiveTool,
    setEditingId,
    setSelectedId,
  ]);

  return (
    <div className="w-full h-screen relative overflow-hidden bg-background">
      <SimulationCanvas />
      <MainToolbar />
      <BuildToolbar />
      {showControls && <ControlsHint />}
      {selectedId && <SelectionPanel />}
      {showMinimap && <Minimap />}
      <WeatherPanel />
      <CameraReadout />
      {/* Hidden textarea for text editing */}
      {editingId && (
        <textarea
          autoFocus
          className="fixed top-[-9999px] left-[-9999px] opacity-0"
          value={editingShape?.text || ""}
          onFocus={(e) => {
            const val = e.target.value;
            e.target.setSelectionRange(val.length, val.length);
          }}
          onChange={(e) => updateShape(editingId, { text: e.target.value })}
          onBlur={(e) => {
            // Delay to allow canvas clicks to process first
            setTimeout(() => {
              if (useSimulationStore.getState().editingId === editingId) {
                const currentShape = useSimulationStore
                  .getState()
                  .shapes.find((s) => s.id === editingId);
                if (
                  currentShape &&
                  (!currentShape.text || currentShape.text.trim() === "")
                ) {
                  useSimulationStore.getState().deleteShape(editingId);
                }
                useSimulationStore.getState().setEditingId(null);
              }
            }, 100);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const currentShape = useSimulationStore
                .getState()
                .shapes.find((s) => s.id === editingId);
              if (
                currentShape &&
                (!currentShape.text || currentShape.text.trim() === "")
              ) {
                useSimulationStore.getState().deleteShape(editingId);
              }
              setEditingId(null);
            }
            if (e.key === "Escape") {
              const currentShape = useSimulationStore
                .getState()
                .shapes.find((s) => s.id === editingId);
              if (
                currentShape &&
                (!currentShape.text || currentShape.text.trim() === "")
              ) {
                useSimulationStore.getState().deleteShape(editingId);
              }
              setEditingId(null);
            }
          }}
        />
      )}
    </div>
  );
}
