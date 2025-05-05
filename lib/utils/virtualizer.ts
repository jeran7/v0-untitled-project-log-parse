/**
 * Create a virtual window for efficient rendering of large datasets
 * @param totalItems Total number of items in the dataset
 * @param visibleItems Number of items visible in the viewport
 * @param currentIndex Current center index
 */
export function createVirtualWindow(
  totalItems: number,
  visibleItems: number,
  currentIndex: number,
): { startIndex: number; endIndex: number } {
  // Add buffer items before and after visible items
  const bufferItems = Math.floor(visibleItems / 2)

  // Calculate start and end indexes
  let startIndex = Math.max(0, currentIndex - visibleItems - bufferItems)
  let endIndex = Math.min(totalItems - 1, currentIndex + visibleItems + bufferItems)

  // Ensure we have enough items to fill the viewport
  if (endIndex - startIndex + 1 < visibleItems * 2) {
    if (startIndex === 0) {
      endIndex = Math.min(totalItems - 1, visibleItems * 2)
    } else if (endIndex === totalItems - 1) {
      startIndex = Math.max(0, totalItems - visibleItems * 2)
    }
  }

  return { startIndex, endIndex }
}

/**
 * Calculate the visible items based on container size and item height
 * @param containerHeight Height of the viewport container
 * @param itemHeight Height of each item
 */
export function calculateVisibleItems(containerHeight: number, itemHeight: number): number {
  return Math.ceil(containerHeight / itemHeight) + 2 // Add 2 for partial items
}

/**
 * Calculate the total height of all items
 * @param totalItems Total number of items
 * @param itemHeight Height of each item
 */
export function calculateTotalHeight(totalItems: number, itemHeight: number): number {
  return totalItems * itemHeight
}

/**
 * Calculate the offset for a specific index
 * @param index Item index
 * @param itemHeight Height of each item
 */
export function calculateOffset(index: number, itemHeight: number): number {
  return index * itemHeight
}
