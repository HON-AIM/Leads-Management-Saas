import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocationFilterState {
  selectedCountryId: string | null
  selectedRegionId: string | null
  selectedTerritoryId: string | null
  searchQuery: string
  drawerOpen: boolean
  drawerMode: 'create' | 'edit' | 'view' | null
}

interface LocationStoreActions {
  setSelectedCountryId: (id: string | null) => void
  setSelectedRegionId: (id: string | null) => void
  setSelectedTerritoryId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  openDrawer: (mode: 'create' | 'edit' | 'view') => void
  closeDrawer: () => void
  reset: () => void
}

type ILocationStore = LocationFilterState & LocationStoreActions

const initialState: LocationFilterState = {
  selectedCountryId: null,
  selectedRegionId: null,
  selectedTerritoryId: null,
  searchQuery: '',
  drawerOpen: false,
  drawerMode: null,
}

export const useLocationStore = create<ILocationStore>()(
  persist(
    (set) => ({
      ...initialState,
      setSelectedCountryId: (id) => set({ selectedCountryId: id, selectedRegionId: null, selectedTerritoryId: null }),
      setSelectedRegionId: (id) => set({ selectedRegionId: id, selectedTerritoryId: null }),
      setSelectedTerritoryId: (id) => set({ selectedTerritoryId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      openDrawer: (mode) => set({ drawerOpen: true, drawerMode: mode }),
      closeDrawer: () => set({ drawerOpen: false, drawerMode: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'location-store',
      partialize: (state) => ({
        selectedCountryId: state.selectedCountryId,
        selectedRegionId: state.selectedRegionId,
      }),
    }
  )
)
