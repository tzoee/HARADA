import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type Language = 'en' | 'id';

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Language
  language: Language;
  setLanguage: (language: Language) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Detail Panel
  detailPanelOpen: boolean;
  selectedNodeId: string | null;
  openDetailPanel: (nodeId: string) => void;
  closeDetailPanel: () => void;

  // Tower View
  focusedNodeId: string | null;
  setFocusedNode: (nodeId: string | null) => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  rotationAngle: number;
  setRotationAngle: (angle: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme - default to dark
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Language - default to English
      language: 'en',
      setLanguage: (language) => set({ language }),

      // Sidebar - default to expanded
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Detail Panel - default to closed
      detailPanelOpen: false,
      selectedNodeId: null,
      openDetailPanel: (nodeId) =>
        set({ detailPanelOpen: true, selectedNodeId: nodeId }),
      closeDetailPanel: () =>
        set({ detailPanelOpen: false, selectedNodeId: null }),

      // Tower View
      focusedNodeId: null,
      setFocusedNode: (nodeId) => set({ focusedNodeId: nodeId }),
      zoomLevel: 1,
      setZoomLevel: (level) =>
        set({ zoomLevel: Math.max(0.5, Math.min(2, level)) }),
      rotationAngle: 0,
      setRotationAngle: (angle) =>
        set({ rotationAngle: Math.max(-30, Math.min(30, angle)) }),
    }),
    {
      name: 'harada-pillars-ui',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
