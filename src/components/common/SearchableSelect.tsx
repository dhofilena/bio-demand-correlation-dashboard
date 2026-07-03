import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string = string> {
  value: T;
  options: SearchableSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function SearchableSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: Props<T>) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const positionPanel = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const maxHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;

    setPanelStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4, maxHeight }
        : { top: rect.bottom + 4, maxHeight }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    positionPanel();
    const onLayout = () => positionPanel();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const stopBubble = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      className={`searchable-select${className ? ` ${className}` : ''}`}
      onClick={stopBubble}
      onMouseDown={stopBubble}
    >
      <button
        ref={triggerRef}
        type="button"
        className="searchable-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="searchable-select__value">{selected?.label ?? placeholder}</span>
        <span className="searchable-select__chevron" aria-hidden>
          ▾
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              className="searchable-select__panel searchable-select__panel--portal"
              role="listbox"
              id={listId}
              style={panelStyle}
              onClick={stopBubble}
              onMouseDown={stopBubble}
            >
              <input
                ref={inputRef}
                type="search"
                className="searchable-select__search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={`${ariaLabel ?? 'Select'} search`}
              />
              <div className="searchable-select__options">
                {filtered.length ? (
                  filtered.map((option) => {
                    const active = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`searchable-select__option${active ? ' searchable-select__option--active' : ''}`}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })
                ) : (
                  <div className="searchable-select__empty">No matches</div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
