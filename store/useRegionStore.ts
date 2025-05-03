import { create } from "zustand";

interface Region {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
}

interface RegionStore {
  regions: Region[];
  activeRegionId: string | null;
  addRegion: (region: Region) => void;
  updateRegion: (id: string, updater: (region: Region) => Region) => void;
  removeRegion: (id: string) => void;
  setActiveRegionId: (id: string | null) => void;
}

export const useRegionStore = create<RegionStore>((set) => ({
  regions: [],
  activeRegionId: null,
  addRegion: (region) =>
    set((state) => ({ regions: [...state.regions, region] })),
  updateRegion: (id, updater) =>
    set((state) => ({
      regions: state.regions.map((r) => (r.id === id ? updater(r) : r)),
    })),
  removeRegion: (id) =>
    set((state) => ({
      regions: state.regions.filter((r) => r.id !== id),
      activeRegionId: null,
    })),
  setActiveRegionId: (id) => set({ activeRegionId: id }),
}));
