import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"
import { LogViewer } from "@/components/LogViewer/LogViewer"
import type { LogEntry } from "@/types/logs"
import { DEFAULT_COLUMNS } from "@/components/LogViewer/constants"

// Mock react-window
jest.mock("react-window", () => ({
  FixedSizeList: ({ children, itemCount, itemSize, width, height }: any) => {
    const items = []
    for (let i = 0; i < Math.min(itemCount, 100); i++) {
      items.push(
        children({
          index: i,
          style: { height: itemSize, width, position: "absolute", top: i * itemSize },
        }),
      )
    }
    return <div style={{ height, width, position: "relative", overflow: "auto" }}>{items}</div>
  },
}))

// Mock react-virtualized-auto-sizer
jest.mock(
  "react-virtualized-auto-sizer",
  () =>
    ({ children }: any) =>
      children({ height: 500, width: 1000 }),
)

// Mock DnD
jest.mock("react-dnd", () => ({
  DndProvider: ({ children }: any) => children,
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()],
}))

// Mock react-resizable
jest.mock("react-resizable", () => ({
  ResizableBox: ({ children }: any) => children,
  Resizable: ({ children }: any) => children,
}))

// Create mock store
const mockStore = configureStore([])

// Generate mock log entries
const generateMockLogs = (count: number, fileId: string): Record<string, LogEntry> => {
  const logs: Record<string, LogEntry> = {}

  for (let i = 0; i < count; i++) {
    const id = `log-${i}`
    logs[id] = {
      id,
      fileId,
      lineNumber: i,
      timestamp: new Date(Date.now() + i * 1000),
      level: i % 4 === 0 ? "ERROR" : i % 3 === 0 ? "WARNING" : i % 2 === 0 ? "INFO" : "DEBUG",
      source: `source-${i % 5}`,
      message: `This is log message ${i}`,
      raw: `[${new Date(Date.now() + i * 1000).toISOString()}] [${i % 4 === 0 ? "ERROR" : i % 3 === 0 ? "WARNING" : i % 2 === 0 ? "INFO" : "DEBUG"}] [source-${i % 5}] This is log message ${i}`,
    }
  }

  return logs
}

describe("LogViewer Component", () => {
  const fileId = "test-file-1"
  const mockLogs = generateMockLogs(1000, fileId)

  // Create initial state
  const initialState = {
    logs: {
      entries: mockLogs,
      indexes: {
        byTimestamp: {},
        byFile: { [fileId]: Object.keys(mockLogs) },
      },
      virtualWindow: {
        startIndex: 0,
        endIndex: 100,
        totalCount: Object.keys(mockLogs).length,
      },
      timeRange: null,
      filters: {
        search: "",
        logLevel: [],
        source: [],
      },
      columnPreferences: {
        [fileId]: DEFAULT_COLUMNS,
      },
      activeLogEntry: null,
    },
    files: {
      files: {
        [fileId]: {
          id: fileId,
          name: "test-file.log",
          size: 1024 * 1024,
          type: "text/plain",
          lastModified: Date.now(),
          totalChunks: 1,
          logCount: Object.keys(mockLogs).length,
        },
      },
      processingStatus: {
        [fileId]: "completed",
      },
      processingProgress: {
        [fileId]: 100,
      },
      processingError: {
        [fileId]: null,
      },
      selectedFileIds: [fileId],
    },
    ui: {
      timeZone: "UTC",
      viewMode: "correlated",
    },
  }

  let store: any

  beforeEach(() => {
    store = mockStore(initialState)
    store.dispatch = jest.fn()
  })

  test("renders log viewer with logs", () => {
    render(
      <Provider store={store}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Check if log entries are rendered
    expect(screen.getAllByRole("row").length).toBeGreaterThan(0)
  })

  test("filters logs when search is applied", () => {
    const filteredState = {
      ...initialState,
      logs: {
        ...initialState.logs,
        filters: {
          ...initialState.logs.filters,
          search: "message 5",
        },
      },
    }

    const filteredStore = mockStore(filteredState)
    filteredStore.dispatch = jest.fn()

    render(
      <Provider store={filteredStore}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Check if filter is applied
    const filterInput = screen.getByPlaceholderText("Filter logs...")
    expect(filterInput).toHaveValue("message 5")
  })

  test("shows placeholder when no logs match filter", () => {
    const noMatchState = {
      ...initialState,
      logs: {
        ...initialState.logs,
        filters: {
          ...initialState.logs.filters,
          search: "no match will be found",
        },
      },
    }

    const noMatchStore = mockStore(noMatchState)
    noMatchStore.dispatch = jest.fn()

    render(
      <Provider store={noMatchStore}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Check if placeholder is shown
    expect(screen.getByText("No logs found for the selected criteria")).toBeInTheDocument()
  })

  test("shows loading state when processing logs", () => {
    const loadingState = {
      ...initialState,
      files: {
        ...initialState.files,
        processingStatus: {
          [fileId]: "processing",
        },
      },
    }

    const loadingStore = mockStore(loadingState)
    loadingStore.dispatch = jest.fn()

    render(
      <Provider store={loadingStore}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Check if loading message is shown
    expect(screen.getByText("Processing log file...")).toBeInTheDocument()
  })

  test("shows error state when processing fails", () => {
    const errorState = {
      ...initialState,
      files: {
        ...initialState.files,
        processingStatus: {
          [fileId]: "error",
        },
        processingError: {
          [fileId]: "Failed to process log file",
        },
      },
    }

    const errorStore = mockStore(errorState)
    errorStore.dispatch = jest.fn()

    render(
      <Provider store={errorStore}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Check if error message is shown
    expect(screen.getByText("Error processing log file")).toBeInTheDocument()
    expect(screen.getByText("Failed to process log file")).toBeInTheDocument()
  })

  test("selects log entry when clicked", () => {
    render(
      <Provider store={store}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    // Click on a log entry
    const logRows = screen.getAllByRole("row")
    fireEvent.click(logRows[1])

    // Check if dispatch was called with setActiveLogEntry
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("setActiveLogEntry"),
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
        entries: largeLogs,
        virtualWindow: {
          ...initialState.logs.virtualWindow,
          totalCount: Object.keys(largeLogs).length,
        },
      },
      files: {
        ...initialState.files,
        files: {
          [fileId]: {
            ...initialState.files.files[fileId],
            logCount: Object.keys(largeLogs).length,
          },
        },
      },
    }

    const largeDataStore = mockStore(largeDataState)
    largeDataStore.dispatch = jest.fn()

    // Measure rendering time
    const startTime = performance.now()

    render(
      <Provider store={largeDataStore}>
        <LogViewer fileId={fileId} />
      </Provider>,
    )

    const endTime = performance.now()

    // Rendering should be fast even with large datasets
    expect(endTime - startTime).toBeLessThan(500) // Should render in less than 500ms

    // Check that virtualization is working (not all 10000 rows are in the DOM)
    const renderedRows = screen.getAllByRole("row")
    expect(renderedRows.length).toBeLessThan(200) // Should only render visible rows plus buffer
  })
})
