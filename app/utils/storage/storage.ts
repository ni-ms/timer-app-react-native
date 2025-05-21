// app/models/StructuredTimerStore.ts (or your preferred filename and location)

import AsyncStorage from "@react-native-async-storage/async-storage"
import { types, flow, Instance, applySnapshot, getSnapshot } from "mobx-state-tree"
import { TimerModel, Timer, TimerSnapshotIn } from "@/models" // Adjust path if Timer.ts is elsewhere

// --- AsyncStorage Utility Functions ---
// (These are generic and can be kept in a separate app/utils/storage.ts file if preferred)

export async function load<T = any>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key)
    if (data) {
      console.log(
        `[AsyncStorage LOAD] Key: "${key}", Raw Data Preview:`,
        data.substring(0, 150) + (data.length > 150 ? "..." : ""),
      )
      return JSON.parse(data) as T
    }
    console.log(`[AsyncStorage LOAD] Key: "${key}", No data found.`)
    return null
  } catch (e) {
    console.error(`[AsyncStorage LOAD] Failed to load/parse data for key: "${key}". Error:`, e)
    // Consider if data is corrupt, maybe remove it?
    // await AsyncStorage.removeItem(key);
    // console.warn(`[AsyncStorage LOAD] Removed potentially corrupt data for key: "${key}"`);
    return null
  }
}

export async function save(key: string, value: any): Promise<boolean> {
  try {
    const stringifiedValue = JSON.stringify(value)
    await AsyncStorage.setItem(key, stringifiedValue)
    console.log(
      `[AsyncStorage SAVE] Key: "${key}", Successfully saved. Value Preview:`,
      stringifiedValue.substring(0, 150) + (stringifiedValue.length > 150 ? "..." : ""),
    )
    return true
  } catch (e) {
    console.error(`[AsyncStorage SAVE] Failed to save data for key: "${key}". Error:`, e)
    console.error(`[AsyncStorage SAVE] Value that failed to save:`, value) // Log the actual object
    return false
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
    console.log(`[AsyncStorage REMOVE] Successfully removed item for key: "${key}".`)
  } catch (e) {
    console.error(`[AsyncStorage REMOVE] Failed to remove item for key: "${key}". Error:`, e)
  }
}

export async function clearAllStorage(): Promise<void> {
  try {
    await AsyncStorage.clear()
    console.log(`[AsyncStorage CLEAR] All AsyncStorage data cleared.`)
  } catch (e) {
    console.error(`[AsyncStorage CLEAR] Failed to clear AsyncStorage. Error:`, e)
  }
}

// --- Structured Timer Store Definition ---

const STORAGE_KEY = "structuredTimers_v1" // Use a versioned key for easier migrations

const StructuredTimerStoreModel = types
  .model("StructuredTimerStore", {
    timers: types.array(TimerModel),
    // You could add other global app state here if needed, e.g., availableCategories
    availableCategories: types.optional(types.array(types.string), [
      "Workout",
      "Study",
      "Break",
      "Work",
    ]),
  })
  .actions((self) => ({
    // Action to add a new timer
    addTimer(timerData: {
      name: string
      duration: number
      category: string
      isHalfwayAlertEnabled?: boolean
    }) {
      const newTimerSnapshot: TimerSnapshotIn = {
        id: String(Date.now() + Math.random()), // Simple unique ID
        name: timerData.name,
        duration: timerData.duration,
        category: timerData.category,
        remainingTime: timerData.duration, // Initial remaining time is full duration
        status: "idle", // Default status
        isHalfwayAlertEnabled: timerData.isHalfwayAlertEnabled || false,
        halfwayAlertTriggered: false, // Reset on creation
        createdAt: new Date().getTime(), // Store as timestamp
      }
      const newTimerInstance = TimerModel.create(newTimerSnapshot)
      self.timers.push(newTimerInstance)
      this.persistTimers() // Save after adding
      console.log(`[Store] Added timer: ${newTimerInstance.name}`)
    },

    // Action to remove a timer by its instance
    removeTimer(timerInstance: Timer) {
      // timerInstance.beforeDestroy?.(); // Call beforeDestroy if defined (good for cleanup like intervals)
      self.timers.remove(timerInstance) // MST's array remove method
      this.persistTimers() // Save after removing
      console.log(`[Store] Removed timer: ${timerInstance.name}`)
    },

    // Helper to find a timer by its ID
    findTimerById(timerId: string): Timer | undefined {
      return self.timers.find((t) => t.id === timerId)
    },

    // Action to load timers from storage
    hydrateTimers: flow(function* hydrateTimersFlow() {
      // Added name to flow for better debugging
      console.log(`[Store] Attempting to hydrate timers from key: "${STORAGE_KEY}"...`)
      try {
        const storedTimerSnapshots = yield load<TimerSnapshotIn[]>(STORAGE_KEY)
        if (storedTimerSnapshots && Array.isArray(storedTimerSnapshots)) {
          const validSnapshots = storedTimerSnapshots
            .map(
              (snap) =>
                ({
                  ...snap, // Spread existing valid snapshot properties
                  // Re-validate or provide defaults for critical fields during hydration
                  id: String(snap.id || Date.now() + Math.random()),
                  name: snap.name || "Unnamed Timer",
                  duration: Number(snap.duration) || 60,
                  category: snap.category || "Default",
                  // Reset runtime state for each timer on load
                  remainingTime: Number(snap.duration) || 60, // Reset to full duration
                  status: "idle", // Always start idle
                  isHalfwayAlertEnabled: !!snap.isHalfwayAlertEnabled,
                  halfwayAlertTriggered: false, // Reset this flag
                  createdAt: Number(snap.createdAt) || new Date().getTime(), // Ensure it's a timestamp
                }) as TimerSnapshotIn,
            )
            .filter((snap) => snap.id && snap.name && snap.duration > 0) // Filter out clearly invalid ones

          applySnapshot(self.timers, validSnapshots)
          console.log(`[Store] Timers hydrated successfully. Count: ${self.timers.length}`)
        } else {
          applySnapshot(self.timers, []) // Ensure it's an empty array if nothing valid is loaded
          console.log(
            `[Store] No valid timers found in storage for key "${STORAGE_KEY}", initialized empty.`,
          )
        }
      } catch (e) {
        console.error(`[Store] CRITICAL Error during timer hydration from key "${STORAGE_KEY}":`, e)
        applySnapshot(self.timers, []) // Fallback to empty on critical error
      }
    }),

    // Action to save the current state of timers to storage
    persistTimers() {
      const snapshot = getSnapshot(self.timers)
      save(STORAGE_KEY, snapshot) // getSnapshot correctly serializes the array of TimerModel instances
      console.log(
        `[Store] persistTimers called. ${self.timers.length} timers' snapshot sent for saving.`,
      )
    },

    // --- Bulk Category Actions ---
    startCategoryTimers(category: string) {
      console.log(`[Store] Starting timers for category: ${category}`)
      self.timers
        .filter((timer) => timer.category === category && timer.status !== "completed")
        .forEach((timer) => timer.start())
      // Optional: this.persistTimers(); if you want to save "running" state immediately
    },
    pauseCategoryTimers(category: string) {
      console.log(`[Store] Pausing timers for category: ${category}`)
      self.timers
        .filter((timer) => timer.category === category && timer.status === "running")
        .forEach((timer) => timer.pause())
      // Optional: this.persistTimers();
    },
    resetCategoryTimers(category: string) {
      console.log(`[Store] Resetting timers for category: ${category}`)
      self.timers.filter((timer) => timer.category === category).forEach((timer) => timer.reset())
      this.persistTimers() // Resetting implies a state worth saving
    },
    addNewCategory(categoryName: string) {
      if (categoryName && !self.availableCategories.includes(categoryName)) {
        self.availableCategories.push(categoryName)
        // Persist if you want categories saved (would need to add availableCategories to snapshot logic)
        // For now, categories are ephemeral or tied to existing timers.
      }
    },
  }))
  .views((self) => ({
    get timersByCategory() {
      const grouped: { [key: string]: Timer[] } = {}
      self.timers.forEach((timer) => {
        if (!grouped[timer.category]) {
          grouped[timer.category] = []
        }
        grouped[timer.category].push(timer)
      })
      return grouped
    },
    get categories() {
      const timerCategories = new Set(self.timers.map((t) => t.category))
      const allCategories = new Set([...self.availableCategories, ...Array.from(timerCategories)])
      return Array.from(allCategories).sort()
    },
    // Add any other views you need, e.g., completed timers, logs if you integrate them here
  }))

// --- Store Instance Creation and Initialization ---

// Create an instance of the store
const structuredTimerStore = StructuredTimerStoreModel.create({
  // Initial state can be empty or pre-filled if desired
  // timers: [], // Will be populated by hydrateTimers
  // availableCategories: ["Default Category"] // Example initial categories
})

// Load timers from storage when the store is initialized
// This is an async operation; UI should handle potential loading state.
structuredTimerStore.hydrateTimers().catch((error) => {
  console.error("[Store Init] Error during initial hydration:", error)
  // The app will proceed with an empty timer list if hydration fails
})

// --- Exports ---
export { structuredTimerStore } // Export the singleton instance
export type IStructuredTimerStore = Instance<typeof StructuredTimerStoreModel>

// For debugging in development:
if (__DEV__) {
  // Make the store globally accessible for debugging
  // In your browser console (with remote JS debugging) you can type: _mstStore
  ;(global as any)._mstStore = structuredTimerStore
  console.log("StructuredTimerStore instance assigned to global._mstStore for debugging.")
}
