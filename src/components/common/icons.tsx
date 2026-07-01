// Minimal inline icon set (stroke = currentColor) so icons inherit text color
// and theme without an icon dependency.
type P = { size?: number; className?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const ArrowUp = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
export const ArrowDown = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12l7 7 7-7" /></svg>
);
export const ArrowRight = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
export const ChevronDown = ({ size = 14, className }: P) => (
  <svg {...base(size)} className={className}><path d="M6 9l6 6 6-6" /></svg>
);
export const Upload = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
);
export const Download = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 4v12M7 11l5 5 5-5M5 20h14" /></svg>
);
export const Refresh = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
);
export const Sun = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>
);
export const Moon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);
export const Info = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
);
export const Bolt = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></svg>
);
export const Plug = ({ size = 15, className }: P) => (
  <svg {...base(size)} className={className}><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8zM12 16v6" /></svg>
);
