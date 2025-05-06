import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { Filter, FilterPreset } from "@/types/filters"
import { v4 as uuidv4 } from "uuid"

interface FiltersState {
  // Active filters
  filters: Filter[]
  // Saved filter presets
  presets: FilterPreset[]
  // Whether filters are being applied
  isFiltering: boolean
  // Last filter update timestamp for debouncing
  lastFilterUpdate: number
  // Meta information about available filter options
  availableLogLevels: string[]
  availableSources: string[]
  // Undo/redo history
  past: Filter[][]
  future: Filter[][]
}

const initialState: FiltersState = {
  filters: [],
  presets: [],
  isFiltering: false,
  lastFilterUpdate: 0,
  availableLogLevels: [],
  availableSources: [],
  past: [],
  future: [],
}

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    // Add a new filter
    addFilter: (state, action: PayloadAction<Omit<Filter, "id">>) => {
      // Save current state to past for undo
      state.past.push([...state.filters])
      state.future = []

      const filter = { ...action.payload, id: uuidv4() }
      state.filters.push(filter as Filter)
      state.lastFilterUpdate = Date.now()
    },

    // Update an existing filter
    updateFilter: (state, action: PayloadAction<Filter>) => {
      const index = state.filters.findIndex((f) => f.id === action.payload.id)
      if (index !== -1) {
        // Save current state to past for undo
        state.past.push([...state.filters])
        state.future = []

        state.filters[index] = action.payload
        state.lastFilterUpdate = Date.now()
      }
    },

    // Remove a filter
    removeFilter: (state, action: PayloadAction<string>) => {
      // Save current state to past for undo
      state.past.push([...state.filters])
      state.future = []

      state.filters = state.filters.filter((f) => f.id !== action.payload)
      state.lastFilterUpdate = Date.now()
    },

    // Set all filters
    setFilters: (state, action: PayloadAction<Filter[]>) => {
      // Save current state to past for undo
      state.past.push([...state.filters])
      state.future = []

      state.filters = action.payload
      state.lastFilterUpdate = Date.now()
    },

    // Toggle filter enabled state
    toggleFilterEnabled: (state, action: PayloadAction<string>) => {
      const filter = state.filters.find((f) => f.id === action.payload)
      if (filter) {
        // Save current state to past for undo
        state.past.push([...state.filters])
        state.future = []

        filter.enabled = !filter.enabled
        state.lastFilterUpdate = Date.now()
      }
    },

    // Update available log levels
    setAvailableLogLevels: (state, action: PayloadAction<string[]>) => {
      state.availableLogLevels = action.payload
    },

    // Update available sources
    setAvailableSources: (state, action: PayloadAction<string[]>) => {
      state.availableSources = action.payload
    },

    // Save a filter preset
    saveFilterPreset: (state, action: PayloadAction<{ name: string; filters: Filter[] }>) => {
      const { name, filters } = action.payload
      const newPreset: FilterPreset = {
        id: uuidv4(),
        name,
        filters,
        createdAt: new Date(),
        lastUsed: null,
      }
      state.presets.push(newPreset)
    },

    // Delete a filter preset
    deleteFilterPreset: (state, action: PayloadAction<string>) => {
      state.presets = state.presets.filter((p) => p.id !== action.payload)
    },

    // Apply a filter preset
    applyFilterPreset: (state, action: PayloadAction<string>) => {
      const preset = state.presets.find((p) => p.id === action.payload)
      if (preset) {
        // Save current state to past for undo
        state.past.push([...state.filters])
        state.future = []

        state.filters = [...preset.filters]
        preset.lastUsed = new Date()
        state.lastFilterUpdate = Date.now()
      }
    },

    // Set filtering state
    setIsFiltering: (state, action: PayloadAction<boolean>) => {
      state.isFiltering = action.payload
    },

    // Reset all filters
    resetFilters: (state) => {
      // Save current state to past for undo
      state.past.push([...state.filters])
      state.future = []

      state.filters = []
      state.isFiltering = false
      state.lastFilterUpdate = Date.now()
    },

    // Undo last filter change
    undoFilterChange: (state) => {
      if (state.past.length === 0) return

      // Save current state to future for redo
      state.future.push([...state.filters])

      // Get the last state from past
      const previousFilters = state.past.pop()
      if (previousFilters) {
        state.filters = previousFilters
        state.lastFilterUpdate = Date.now()
      }
    },

    // Redo last undone filter change
    redoFilterChange: (state) => {
      if (state.future.length === 0) return

      // Save current state to past for undo
      state.past.push([...state.filters])

      // Get the next state from future
      const nextFilters = state.future.pop()
      if (nextFilters) {
        state.filters = nextFilters
        state.lastFilterUpdate = Date.now()
      }
    },
  },
})

export const {
  addFilter,
  updateFilter,
  removeFilter,
  setFilters,
  toggleFilterEnabled,
  setAvailableLogLevels,
  setAvailableSources,
  saveFilterPreset,
  deleteFilterPreset,
  applyFilterPreset,
  setIsFiltering,
  resetFilters,
  undoFilterChange,
  redoFilterChange,
} = filtersSlice.actions

export default filtersSlice.reducer
