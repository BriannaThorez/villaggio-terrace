import { useFlowchartStore, FlowchartState, PortType } from '../shared/utils/store';
import { 
  Cursor01Icon, Home01Icon, ShoppingBag01Icon, OfficeIcon, Settings01Icon, Building01Icon, Building02Icon,
  Edit01Icon, ViewIcon, CheckmarkCircle01Icon, Download01Icon,
  Menu01Icon, FlashIcon, Wifi01Icon, ArrowTurnBackwardIcon, ArrowTurnForwardIcon
} from 'hugeicons-react';
import { Minimap } from './Minimap';
import { SmartTooltip } from '../shared/components/SmartTooltip';
import { generateSVG } from '../shared/utils/svgExport';
import { useMemo, useState } from 'react';
import themes from '../shared/themes/color_palettes.json';


export const Toolbar = () => {
  const setActiveTool = useFlowchartStore(state => state.setActiveTool);
  const activeTool = useFlowchartStore(state => state.activeTool);
  const mode = useFlowchartStore(state => state.mode);
  const setMode = useFlowchartStore(state => state.setMode);
  const themeName = useFlowchartStore(state => state.themeName);
  const setThemeName = useFlowchartStore(state => state.setThemeName);
  const resources = useFlowchartStore(state => state.resources);
  const undo = useFlowchartStore(state => state.undo);
  const redo = useFlowchartStore(state => state.redo);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleExport = () => {
    const state = useFlowchartStore.getState();
    const shapes = state.shapes;
    const links = state.links;
    
    if (shapes.length === 0) return;

    const currentTheme = themes[themeName as keyof typeof themes];
    const svg = generateSVG(shapes, links, currentTheme, themeName);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laurianna-flow-export-${new Date().getTime()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tools = useMemo(() => [
    { id: 'select' as const, icon: Cursor01Icon, label: 'Select', description: 'Select and manipulate building modules.', shortcut: '1' },
    { id: 'lobby' as const, icon: Building01Icon, label: 'Lobby', description: 'Place lobby and entrance modules. Click-drag to build multiple.', shortcut: '2' },
    { id: 'residential' as const, icon: Home01Icon, label: 'Residential', description: 'Place residential apartments (4 cells wide).', shortcut: '3' },
    { id: 'office' as const, icon: OfficeIcon, label: 'Office', description: 'Place office suites (5 cells wide).', shortcut: '4' },
    { id: 'utility' as const, icon: Settings01Icon, label: 'Utility', description: 'Place power and water utilities.', shortcut: '5' },
    { id: 'elevator' as const, icon: Building02Icon, label: 'Elevator', description: 'Place elevator shafts.', shortcut: '6' },
  ], []);

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-4 items-start z-50">
      {/* Mode Switcher & Export */}
      <div className="bg-background/90 backdrop-blur-xl p-1.5 rounded-xl border border-text/10 flex gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)] items-center relative z-50">
        <button className="p-2 rounded-lg text-text/60 hover:bg-primary/10 hover:text-primary">
          <Menu01Icon size={20} />
        </button>
        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />
        <SmartTooltip content="Power">
          <div className="flex items-center gap-1 px-2 text-sm font-medium text-text/80">
            {resources.power} <FlashIcon size={16} className="text-yellow-500" />
          </div>
        </SmartTooltip>
        <SmartTooltip content="Water">
          <div className="flex items-center gap-1 px-2 text-sm font-medium text-text/80">
            {resources.water} <Settings01Icon size={16} className="text-blue-500" />
          </div>
        </SmartTooltip>
        <SmartTooltip content="Internet">
          <div className="flex items-center gap-1 px-2 text-sm font-medium text-text/80">
            {resources.internet} <Wifi01Icon size={16} className="text-green-500" />
          </div>
        </SmartTooltip>
        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />
        <SmartTooltip content="Studio Mode" description="Full creative control. Create, edit, and link nodes." position="bottom">
          <button
            onClick={() => setMode('studio')}
            className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${mode === 'studio' ? 'bg-primary text-background shadow-[0_0_15px_var(--primary)]' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
          >
            <Edit01Icon size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>

        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />

        <SmartTooltip content="Undo" description="Revert the last action." position="bottom">
          <button
            onClick={undo}
            className="p-2 rounded-lg text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
          >
            <ArrowTurnBackwardIcon size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>

        <SmartTooltip content="Redo" description="Restore the last undone action." position="bottom">
          <button
            onClick={redo}
            className="p-2 rounded-lg text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
          >
            <ArrowTurnForwardIcon size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>
        
        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />
        
        <SmartTooltip content="Viewer Mode" description="Clean presentation mode. All editing tools are hidden." position="bottom">
          <button
            onClick={() => setMode('viewer')}
            className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${mode === 'viewer' ? 'bg-primary text-background shadow-[0_0_15px_var(--primary)]' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
          >
            <ViewIcon size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>

        <div className="w-[1px] h-4 bg-text/10 mx-0.5" />

        <div className="relative">
          <SmartTooltip content="Switch Theme" description="Choose a color palette for the entire flowchart studio." position="bottom">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`p-2 rounded-lg transition-all duration-300 flex items-center justify-center ${showThemeMenu ? 'bg-primary/10 text-primary' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
            >
              <Settings01Icon size={18} strokeWidth={2} />
            </button>
          </SmartTooltip>

          {showThemeMenu && (
            <div 
              onMouseLeave={() => setShowThemeMenu(false)}
              className="absolute top-full mt-2 left-0 bg-background/90 backdrop-blur-2xl border border-primary/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1 min-w-[160px] z-[100]"
            >
              <div className="px-2 py-1 border-b border-primary/5 mb-1">
                <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">Select Theme</span>
              </div>
              {Object.entries(themes).map(([name, palette]) => (
                <button
                  key={name}
                  onClick={() => {
                    setThemeName(name);
                    setShowThemeMenu(false);
                  }}
                  className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-xs transition-all ${
                    themeName === name 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-text/60 hover:text-text hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="capitalize">{name.replace('_', ' ')}</span>
                    <div className="flex gap-1">
                      {[palette.neutral_light, palette.neutral_dark, palette.primary, palette.secondary, palette.accent].map((color, i) => (
                        <div 
                          key={i} 
                          className="w-2 h-2 rounded-full border border-white/10" 
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {themeName === name && <CheckmarkCircle01Icon size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <SmartTooltip content="Export Data" description="Download the current flowchart as a structured JSON file." position="bottom">
          <button
            onClick={handleExport}
            className="p-2 rounded-lg text-text/40 hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center"
          >
            <Download01Icon size={18} strokeWidth={2} />
          </button>
        </SmartTooltip>
      </div>

      {/* GUI components hidden in Viewer mode */}
      {mode === 'studio' && (
        <>
          {/* Minimap */}
          <Minimap />

          {/* Toolbox */}
          <div className="w-48 bg-background/90 backdrop-blur-xl p-1 rounded-xl border border-text/10 flex flex-col gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.4)] max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="px-1 py-0.5 border-b border-text/5 mb-0.5 sticky top-0 bg-inherit z-10">
              <span className="text-[8px] font-mono text-text/40 uppercase tracking-widest">Toolbox</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {tools.map((tool) => (
                <SmartTooltip 
                  key={tool.id} 
                  content={tool.label} 
                  description={tool.description}
                  shortcut={tool.shortcut}
                  position="right"
                >
                  <button
                    onClick={() => setActiveTool(tool.id)}
                    className={`p-1.5 rounded-lg transition-all duration-300 flex items-center justify-center ${activeTool === tool.id ? 'bg-primary text-background shadow-[0_0_15_var(--primary)] scale-110' : 'text-text/40 hover:text-primary hover:bg-primary/5'}`}
                  >
                    <tool.icon size={16} strokeWidth={1.5} />
                  </button>
                </SmartTooltip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
