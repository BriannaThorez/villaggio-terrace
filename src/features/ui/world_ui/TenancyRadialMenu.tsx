import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSimulationStore } from "../../../shared/utils/store";
import { useTenancyStore } from "../../tenancy/store/tenancyStore";
import {
  UserPlus,
  UserMinus,
  Info,
  Mouse,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getMenuOffset } from "../../../shared/utils/layout";

interface TenancyRadialMenuProps {
  shapeId: string;
}

interface MenuItemProps {
  id: string;
  icon: React.ReactNode;
  label?: string;
  action: () => void;
  index: number;
  total: number;
  radius: number;
}

const MenuItem = React.memo(
  ({ icon, label, action, index, total, radius }: MenuItemProps) => {
    const setIsPanning = useSimulationStore((state) => state.setIsPanning);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const handlePointerDown = (e: React.PointerEvent) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
      e.stopPropagation();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      setIsPanning(false);
      if (!pointerStartRef.current) return;

      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        action();
      }

      pointerStartRef.current = null;
      e.stopPropagation();
    };

    return (
      <motion.button
        initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
        animate={{ scale: 1, x, y, opacity: 1 }}
        exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
        transition={{ duration: 0.05 }}
        aria-label={label || "Menu Item"}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="pointer-events-auto absolute w-40 h-40 -ml-20 -mt-20 rounded-full border flex flex-col items-center justify-center shadow-lg transition-all group will-change-transform bg-background border-text/20 text-text hover:bg-primary hover:text-background hover:border-accent"
      >
        <div className="scale-[4]">{icon}</div>
        {label && (
          <span
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-[36px] font-bold uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-text drop-shadow-[0_0_10px_var(--background)] ${
              y > 0 ? "-top-28" : "-bottom-28"
            }`}
          >
            {label}
          </span>
        )}
      </motion.button>
    );
  },
);

export const TenancyRadialMenu: React.FC<TenancyRadialMenuProps> = ({ shapeId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const shapes = useSimulationStore((state) => state.shapes);
  const setIsPanning = useSimulationStore((state) => state.setIsPanning);
  const { occupants, assignTenant, evictTenant } = useTenancyStore();

  const shape = useMemo(
    () => shapes.find((s) => s.id === shapeId),
    [shapes, shapeId],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const menuOffset = useMemo(() => {
    if (!shape) {
      return { x: 0, y: 0 };
    }
    return getMenuOffset(shape, shapes);
  }, [shape, shapes]);

  const handleToggle = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      if (e.stopPropagation) e.stopPropagation();
      setIsOpen(!isOpen);
    },
    [isOpen],
  );

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTriggerPointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    e.stopPropagation();
  };

  const handleTriggerPointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (!pointerStartRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      handleToggle(e as any);
    }

    pointerStartRef.current = null;
    if (e.stopPropagation) e.stopPropagation();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left;
      const centerY = rect.top;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 350) {
        setIsOpen(false);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [isOpen]);

  const isOccupied = !!occupants[shapeId];

  const menuItems = useMemo(() => {
    const items = [];
    if (!isOccupied) {
      items.push({
        id: "find",
        icon: <UserPlus size={18} />,
        label: "Find Occupant",
        action: () => {
          // Placeholder implementation
          assignTenant(shapeId, {
            tenantId: `t_${Math.random().toString(36).substr(2, 9)}`,
            name: "John Doe",
            moveInDate: Date.now(),
            monthlyRent: 1500,
          });
          setIsOpen(false);
        },
      });
    } else {
      items.push({
        id: "evict",
        icon: <UserMinus size={18} />,
        label: "Evict",
        action: () => {
          evictTenant(shapeId);
          setIsOpen(false);
        },
      });
      items.push({
        id: "info",
        icon: <Info size={18} />,
        label: "Tenant Info",
        action: () => {
          // Trigger SelectionPanel view (it's already open if this is visible)
          setIsOpen(false);
        },
      });
    }
    return items;
  }, [isOccupied, shapeId, assignTenant, evictTenant]);

  const radius = 240;

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      style={{
        zIndex: 5000,
        width: 0,
        height: 0,
        transform: `translate3d(${menuOffset.x}px, ${menuOffset.y}px, 0)`,
      }}
    >
      <motion.button
        whileHover={{
          scale: 1.1,
          boxShadow: "0 0 100px rgba(var(--accent-rgb),0.8)",
        }}
        whileTap={{ scale: 0.9 }}
        onPointerDown={handleTriggerPointerDown}
        onPointerUp={handleTriggerPointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        className={`pointer-events-auto absolute w-40 h-40 -ml-20 -mt-20 rounded-full bg-background border-8 flex items-center justify-center transition-all duration-300 ${
          isOpen || hovered
            ? "border-accent text-accent shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
            : "border-text/20 text-text shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        } z-20`}
      >
        <div className="scale-[4]">
          {isOpen ? (
            <Mouse size={20} className="text-accent" />
          ) : (
            <Users
              size={22}
              className={hovered ? "text-accent" : "text-text"}
            />
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.05 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-0 left-0"
          >
            {menuItems.map((item, index) => (
              <MenuItem
                key={item.id}
                {...item}
                index={index}
                total={menuItems.length}
                radius={radius}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
