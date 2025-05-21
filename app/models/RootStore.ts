// app/models/RootStore.ts
import {
  Instance,
  SnapshotOut,
  types,
  applySnapshot,
  getSnapshot,
  flow,
  SnapshotIn,
} from "mobx-state-tree" // Added applySnapshot, getSnapshot
import { TimerModel, Timer, TimerSnapshotIn } from "./Timer" // Ensure TimerSnapshotIn is exported from Timer.ts
import { TimerLogModel, TimerLogSnapshotIn } from "./TimerLog" // Ensure TimerLogSnapshotIn is exported
import { load, save } from "../utils/storage"

const TIMERS_STORAGE_KEY = "myTimerAppTimers_v3"
const TIMERLOGS_STORAGE_KEY = "myTimerAppTimerLogs_v3"
const CATEGORIES_STORAGE_KEY = "myTimerAppCategories_v3"

export const RootStoreModel = types
  .model("RootStore")
  .props({
    timers: types.array(TimerModel),
    timerLogs: types.array(TimerLogModel),
    availableCategories: types.optional(types.array(types.string), [
      "Workout",
      "Study",
      "Break",
      "Work",
    ]),
  })
  .actions((self) => ({
    // ... (addTimer, addTimerLog, removeTimer, category actions should be fine but review if error points elsewhere) ...
    addTimer(timerData: {
      name: string
      duration: number
      category: string
      isHalfwayAlertEnabled?: boolean
    }) {
      const newTimerData: TimerSnapshotIn = {
        // Use SnapshotIn for creation
        id: String(Date.now() + Math.random()),
        name: timerData.name,
        duration: timerData.duration,
        remainingTime: timerData.duration,
        category: timerData.category,
        isHalfwayAlertEnabled: timerData.isHalfwayAlertEnabled || false,
        status: "idle",
        createdAt: new Date().getTime(), // Store as timestamp for simplicity in snapshot
        halfwayAlertTriggered: false, // ensure this is set
        completionAcknowledged: false,
      }
      const newTimer = TimerModel.create(newTimerData)
      self.timers.push(newTimer)
      this.saveTimers()
    },
    addTimerLog(timer: Timer) {
      const newLogData: TimerLogSnapshotIn = {
        id: String(Date.now() + Math.random() + 1),
        timerName: timer.name,
        completedAt: new Date().getTime(), // Store as timestamp
        duration: timer.duration,
      }
      const newLog = TimerLogModel.create(newLogData)
      self.timerLogs.unshift(newLog)
      this.saveTimerLogs()
    },
    removeTimer(timer: Timer) {
      timer.beforeDestroy?.() // Manually call if not automatically triggered by MST version with .remove()
      self.timers.remove(timer)
      this.saveTimers()
    },

    // Use `flow` for async actions
    loadStoredData: flow(function* loadStoredDataFlow() {
      // Naming the generator function is good practice
      try {
        console.log("[MST LOAD] Attempting to load timers...")
        // The `yield` keyword is used with `flow` instead of `await`
        const storedTimersJson: TimerSnapshotIn[] | null =
          yield load<TimerSnapshotIn[]>(TIMERS_STORAGE_KEY)

        if (storedTimersJson && Array.isArray(storedTimersJson)) {
          const hydratedTimers: TimerSnapshotIn[] = storedTimersJson
            .map((snap) => ({
              ...snap,
              id: String(snap.id || Date.now() + Math.random()), // Ensure ID is string
              name: String(snap.name || "Unnamed Loaded Timer"),
              duration: Number(snap.duration || 60),
              category: String(snap.category || "Uncategorized"),
              createdAt: snap.createdAt ? new Date(snap.createdAt).getTime() : new Date().getTime(),
              status: "idle", // Always reset status
              remainingTime: Number(snap.duration || 60), // Reset remaining time to full duration
              isHalfwayAlertEnabled: !!snap.isHalfwayAlertEnabled,
              halfwayAlertTriggered: false, // Always reset this flag
              completionAcknowledged: !!snap.completionAcknowledged,
            }))
            .filter(
              (snap) =>
                snap.id && snap.name && typeof snap.duration === "number" && snap.duration > 0,
            ) // Basic validation

          console.log("[MST LOAD] Applying snapshot to self.timers with:", hydratedTimers)
          applySnapshot(self.timers, hydratedTimers) // This is an MST action that replaces the array content
          console.log("[MST LOAD] Timers loaded successfully. Count:", self.timers.length)
        } else {
          console.log("[MST LOAD] No valid timer data found in storage or bad format.")
          applySnapshot(self.timers, []) // Clear if no valid data
        }

        console.log("[MST LOAD] Attempting to load timer logs...")
        const storedLogsJson: TimerLogSnapshotIn[] | null =
          yield load<TimerLogSnapshotIn[]>(TIMERLOGS_STORAGE_KEY)
        if (storedLogsJson && Array.isArray(storedLogsJson)) {
          const hydratedLogs: TimerLogSnapshotIn[] = storedLogsJson
            .map((snap) => ({
              ...snap,
              id: String(snap.id || Date.now() + Math.random()),
              timerName: String(snap.timerName || "Unknown Logged Timer"),
              // Ensure completedAt is a number (timestamp)
              completedAt: snap.completedAt
                ? new Date(snap.completedAt).getTime()
                : new Date().getTime(),
              duration: Number(snap.duration || 0),
            }))
            .filter((snap) => snap.id && snap.timerName)

          console.log("[MST LOAD] Applying snapshot to self.timerLogs with:", hydratedLogs)
          applySnapshot(self.timerLogs, hydratedLogs)
          console.log("[MST LOAD] Timer logs loaded successfully. Count:", self.timerLogs.length)
        } else {
          console.log("[MST LOAD] No valid timer log data found in storage.")
          applySnapshot(self.timerLogs, []) // Clear if no valid data
        }

        console.log("[MST LOAD] Attempting to load available categories...")
        const storedCategories: string[] | null = yield load<string[]>(CATEGORIES_STORAGE_KEY)
        const defaultCategoriesFromModelDefinition = ["Workout", "Study", "Break", "Work"] // Match your props definition

        if (storedCategories && Array.isArray(storedCategories)) {
          const validStoredCategories = storedCategories.filter(
            (cat) => typeof cat === "string" && cat.trim() !== "",
          )
          const combinedCategories = Array.from(
            new Set([...defaultCategoriesFromModelDefinition, ...validStoredCategories]),
          )
          applySnapshot(self.availableCategories, combinedCategories)
          console.log(
            `[RootStore] Available categories loaded and merged. Count: ${self.availableCategories.length}`,
          )
        } else {
          applySnapshot(self.availableCategories, defaultCategoriesFromModelDefinition)
          console.log(
            `[RootStore] No categories found in storage for key "${CATEGORIES_STORAGE_KEY}", applied model defaults.`,
          )
        }
      } catch (error: any) {
        console.error("[MST LOAD] CRITICAL FAILURE in loadStoredData:", error)
        // Fallback to empty/default state for safety
        applySnapshot(self.timers, [])
        applySnapshot(self.timerLogs, [])
        const defaultCategoriesFromModelDefinition = ["Workout", "Study", "Break", "Work"] // Re-define for catch block
        applySnapshot(self.availableCategories, defaultCategoriesFromModelDefinition)
      }
    }),

    saveTimers() {
      // Use getSnapshot to ensure we're saving a clean serializable object
      save(TIMERS_STORAGE_KEY, getSnapshot(self.timers))
      console.log("[MST SAVE] Timers saved. Count:", self.timers.length)
    },
    saveTimerLogs() {
      save(TIMERLOGS_STORAGE_KEY, getSnapshot(self.timerLogs))
      console.log("[MST SAVE] Timer logs saved. Count:", self.timerLogs.length)
    },
    saveAvailableCategories() {
      // Action for categories
      save(CATEGORIES_STORAGE_KEY, getSnapshot(self.availableCategories))
      console.log(
        `[MST SAVE] Available categories saved. Count: ${self.availableCategories.length}`,
      )
    },

    // --- Other Actions ---
    addNewCategory(categoryName: string) {
      if (categoryName && !self.availableCategories.includes(categoryName.trim())) {
        self.availableCategories.push(categoryName.trim())
        this.saveAvailableCategories() // Calls the save action for categories
      }
    },

    // ----- Bulk Actions -----
    startCategoryTimers(category: string) {
      console.log(`[RootStore] Starting timers for category: ${category}`)
      self.timers
        .filter((timer) => timer.category === category && timer.status !== "completed")
        .forEach((timer) => timer.start())
    },
    pauseCategoryTimers(category: string) {
      console.log(`[RootStore] Pausing timers for category: ${category}`)
      self.timers
        .filter((timer) => timer.category === category && timer.status === "running")
        .forEach((timer) => timer.pause())
    },
    resetCategoryTimers(category: string) {
      self.timers.filter((timer) => timer.category === category).forEach((timer) => timer.reset())
      this.saveTimers()
    },

    addImportedTimers(timerSnapshots: TimerSnapshotIn[]): number {
      const currentTimerIds = new Set(self.timers.map((t) => t.id))
      let importedCount = 0
      timerSnapshots.forEach((snap) => {
        // Validate and provide defaults for the imported snapshot
        const validatedSnap: TimerSnapshotIn = {
          id: String(snap.id || Date.now() + Math.random() + importedCount), // Ensure unique ID
          name: snap.name || "Imported Timer",
          duration: typeof snap.duration === "number" && snap.duration > 0 ? snap.duration : 60,
          category: snap.category || "Imported",
          remainingTime:
            typeof snap.duration === "number" && snap.duration > 0 ? snap.duration : 60, // Reset to full duration
          status: "idle", // Always import as idle
          isHalfwayAlertEnabled: !!snap.isHalfwayAlertEnabled,
          halfwayAlertTriggered: false, // Reset
          completionAcknowledged: false, // Reset
          createdAt: snap.createdAt ? new Date(snap.createdAt).getTime() : Date.now(),
        }

        if (!currentTimerIds.has(validatedSnap.id)) {
          // Avoid duplicates by ID
          try {
            const newTimer = TimerModel.create(validatedSnap)
            self.timers.push(newTimer)
            importedCount++
          } catch (e) {
            console.warn("Failed to create Timer from imported snapshot:", validatedSnap, e)
          }
        }
      })

      if (importedCount > 0) {
        this.saveTimers() // Persist changes after importing
      }
      console.log(`[RootStore] Imported ${importedCount} new timers.`)
      return importedCount
    },
  }))
  .views((self) => ({
    // ... views
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
      const allCategories = new Set([
        ...self.availableCategories.slice(),
        ...Array.from(timerCategories),
      ])
      return Array.from(allCategories).sort()
    },
    get sortedTimerLogs() {
      return [...self.timerLogs.slice()]
        .map((log) => ({ ...log, completedAtDate: new Date(log.completedAt) }))
        .sort((a, b) => b.completedAtDate.getTime() - a.completedAtDate.getTime())
    },
  }))

export interface RootStore extends Instance<typeof RootStoreModel> {}

export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
