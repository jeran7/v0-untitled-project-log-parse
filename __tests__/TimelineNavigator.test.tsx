import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"
import TimelineNavigator from "@/components/Timeline/TimelineNavigator"
import type { LogEntry } from "@/types/logs"

// Mock D3
jest.mock("d3", () => ({
  select: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnValue({
      remove: jest.fn(),
      data: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      each: jest.fn(),
    }),
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
  }),
  scaleTime: jest.fn().mockReturnValue({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    invert: jest.fn((x) => new Date()),
  }),
  scaleLinear: jest.fn().mockReturnValue({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  }),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  brushX: jest.fn().mockReturnValue({
    extent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    move: jest.fn(),
  }),
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Create mock store
const mockStore = configureStore([])

// Generate mock log entries
const generateMockLogs = (count: number, fileId: string): LogEntry[] => {
  const logs: LogEntry[] = []

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - (count - i) * 60000) // 1 minute between entries
    logs.push({
      id: `log-${i}`,
      fileId,
      lineNumber: i,
      timestamp,
      level: i % 4 === 0 ? "ERROR" : i % 3 === 0 ? "WARNING" : i % 2 === 0 ? "INFO" : "DEBUG",
      source: `source-${i % 5}`,
      message: `This is log message ${i}`,
      raw: `[${timestamp.toISOString()}] [${i % 4 === 0 ? "ERROR" : i % 3 === 0 ? "WARNING" : i % 2 === 0 ? "INFO" : "DEBUG"}] [source-${i % 5}] This is log message ${i}`,
    })
  }

  return logs
}

describe("TimelineNavigator Component", () => {
  const fileId = "test-file-1"
  const mockLogs = generateMockLogs(1000, fileId)

  // Create initial state
  const initialState = {
    logs: {
      entries: mockLogs.reduce(
        (acc, log) => {
          acc[log.id] = log
          return acc
        },
        {} as Record<string, LogEntry>,
      ),
    },
    timeline: {
      selection: {
        start: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        end: new Date(),
      },
      zoomLevel: "minute",
      liveUpdate: false,
      isDragging: false,
      jumpToTimestamp: null,
      visibleTimeWindow: null,
    },
    filters: {
      filters: [],
      presets: [],
      isFiltering: false,
      lastFilterUpdate: 0,
      availableLogLevels: ["ERROR", "WARNING", "INFO", "DEBUG"],
      availableSources: ["source-0", "source-1", "source-2", "source-3", "source-4"],
    },
    ui: {
      timeZone: "UTC",
    },
  }

  let store: any

  beforeEach(() => {
    store = mockStore(initialState)
    store.dispatch = jest.fn()
  })

  test("renders timeline with logs", () => {
    render(
      <Provider store={store}>
        <TimelineNavigator />
      </Provider>,
    )

    // Verify that the timeline renders
    expect(screen.getByText(/Total:/)).toBeInTheDocument()
    expect(screen.getByText(/Errors:/)).toBeInTheDocument()
    expect(screen.getByText(/Warnings:/)).toBeInTheDocument()
  })

  test("handles zoom level change", () => {
    render(
      <Provider store={store}>
        <TimelineNavigator />
      </Provider>,
    )

    // Find and click the zoom level dropdown
    const zoomSelect = screen.getByRole("combobox")
    fireEvent.click(zoomSelect)

    // Select "hour" zoom level
    const hourOption = screen.getByText("Hour")
    fireEvent.click(hourOption)

    // Check that setZoomLevel was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setZoomLevel"),
        payload: "hour",
      }),
    )
  })

  test("handles zoom in/out", () => {
    render(
      <Provider store={store}>
        <TimelineNavigator />
      </Provider>,
    )

    // Find and click zoom in button
    const zoomInButton = screen.getByLabelText("Zoom In")
    fireEvent.click(zoomInButton)

    // Check that setTimeSelection was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setTimeSelection"),
      }),
    )

    // Find and click zoom out button
    const zoomOutButton = screen.getByLabelText("Zoom Out")
    fireEvent.click(zoomOutButton)

    // Check that setTimeSelection was dispatched again
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setTimeSelection"),
      }),
    )
  })

  test("handles navigation", () => {
    render(
      <Provider store={store}>
        <TimelineNavigator />
      </Provider>,
    )

    // Find and click navigation buttons
    const leftButton = screen.getByLabelText("Navigate Left")
    fireEvent.click(leftButton)

    // Check that setTimeSelection was dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setTimeSelection"),
      }),
    )

    const rightButton = screen.getByLabelText("Navigate Right")
    fireEvent.click(rightButton)

    // Check that setTimeSelection was dispatched again
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setTimeSelection"),
      }),
    )
  })

  // Performance test for large datasets
  test("handles large datasets efficiently", () => {
    // Create a large dataset
    const largeLogs = generateMockLogs(10000, fileId)

    const largeDataState = {
      ...initialState,
      logs: {
        ...initialState.logs,
        entries: largeLogs.reduce(
          (acc, log) => {
            acc[log.id] = log
            return acc
          },
          {} as Record<string, LogEntry>,
        ),
      },
    }

    const largeDataStore = mockStore(largeDataState)
    largeDataStore.dispatch = jest.fn()

    // Measure rendering time
    const startTime = performance.now()

    render(
      <Provider store={largeDataStore}>
        <TimelineNavigator />
      </Provider>,
    )

    const endTime = performance.now()

    // Rendering should be fast even with large datasets
    expect(endTime - startTime).toBeLessThan(500) // Should render in less than 500ms
  })
})
