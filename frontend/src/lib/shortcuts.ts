// Keyboard shortcuts management with custom user re-binding

export interface ShortcutDefinition {
  id: string;
  label: string;
  category: 'Editor' | 'Navigation' | 'Calls' | 'General';
  defaultKey: string;
  currentKey: string;
}

export const DEFAULT_SHORTCUTS: Omit<ShortcutDefinition, 'currentKey'>[] = [
  { id: 'save', label: 'Save Pad content immediately', category: 'Editor', defaultKey: 'Ctrl + S' },
  { id: 'bold', label: 'Format selected text with Bold', category: 'Editor', defaultKey: 'Ctrl + B' },
  { id: 'preview', label: 'Toggle Markdown Preview', category: 'Editor', defaultKey: 'Ctrl + P' },
  { id: 'chat', label: 'Toggle Synchronized Chat panel', category: 'Navigation', defaultKey: 'Ctrl + /' },
  { id: 'command', label: 'Open Command Palette', category: 'Navigation', defaultKey: 'Ctrl + K' },
  { id: 'meet', label: 'Quick Start Video Meet', category: 'Calls', defaultKey: 'Ctrl + M' },
  { id: 'help', label: 'Open Shortcuts Reference', category: 'General', defaultKey: '?' },
];

const STORAGE_KEY = 'padly_custom_shortcuts_v1';

export const getStoredShortcuts = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const getShortcutsList = (): ShortcutDefinition[] => {
  const custom = getStoredShortcuts();
  return DEFAULT_SHORTCUTS.map(sc => ({
    ...sc,
    currentKey: custom[sc.id] || sc.defaultKey,
  }));
};

export const saveShortcut = (id: string, keyCombo: string) => {
  const current = getStoredShortcuts();
  current[id] = keyCombo;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent('padly_shortcuts_updated'));
};

export const resetShortcuts = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('padly_shortcuts_updated'));
};

// Check if a KeyboardEvent matches a keyCombo string (e.g. "Ctrl + S" or "Alt + Shift + K")
export const isShortcutMatch = (e: KeyboardEvent, keyCombo: string): boolean => {
  if (!keyCombo) return false;

  const parts = keyCombo.split('+').map(p => p.trim().toLowerCase());
  const needsCtrl = parts.includes('ctrl') || parts.includes('control');
  const needsMeta = parts.includes('cmd') || parts.includes('meta');
  const needsAlt = parts.includes('alt') || parts.includes('option');
  const needsShift = parts.includes('shift');

  const mainKey = parts.find(p => !['ctrl', 'control', 'cmd', 'meta', 'alt', 'option', 'shift'].includes(p));

  // Ctrl or Meta (Command on Mac)
  if (needsCtrl || needsMeta) {
    if (!e.ctrlKey && !e.metaKey) return false;
  } else {
    if (e.ctrlKey || e.metaKey) return false;
  }

  if (needsAlt && !e.altKey) return false;
  if (!needsAlt && e.altKey) return false;

  if (needsShift && !e.shiftKey) return false;

  if (mainKey) {
    const eventKey = e.key.toLowerCase();
    if (mainKey === '?' && (eventKey === '?' || (e.shiftKey && eventKey === '/'))) return true;
    if (mainKey === '/' && eventKey === '/') return true;
    if (mainKey === 'esc' && eventKey === 'escape') return true;
    if (eventKey === mainKey) return true;
  }

  return false;
};
