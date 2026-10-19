import { create } from "zustand";

interface GraphState {
  expandedSubjectIds: Set<string>;
  selectedUnitId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  focusedNodeId: string | null;
  toggleSubjectExpand: (subjectId: string) => void;
  expandAllSubjects: (subjectIds: string[]) => void;
  collapseAllSubjects: () => void;
  setSelectedUnitId: (unitId: string | null) => void;
  setHoveredNodeId: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFocusedNodeId: (nodeId: string | null) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  expandedSubjectIds: new Set<string>(),
  selectedUnitId: null,
  hoveredNodeId: null,
  searchQuery: "",
  focusedNodeId: null,

  toggleSubjectExpand: (subjectId) =>
    set((state) => {
      const next = new Set(state.expandedSubjectIds);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return { expandedSubjectIds: next };
    }),

  expandAllSubjects: (subjectIds) =>
    set(() => ({
      expandedSubjectIds: new Set(subjectIds),
    })),

  collapseAllSubjects: () =>
    set(() => ({
      expandedSubjectIds: new Set(),
    })),

  setSelectedUnitId: (unitId) => set({ selectedUnitId: unitId }),
  setHoveredNodeId: (nodeId) => set({ hoveredNodeId: nodeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFocusedNodeId: (nodeId) => set({ focusedNodeId: nodeId }),

  reset: () =>
    set({
      expandedSubjectIds: new Set(),
      selectedUnitId: null,
      hoveredNodeId: null,
      searchQuery: "",
      focusedNodeId: null,
    }),
}));
