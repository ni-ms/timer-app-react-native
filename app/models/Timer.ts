import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
// Removed withSetPropAction as we'll ensure all modifications are in explicit actions

export const TimerModel = types
  .model("Timer")
  .props({
    id: types.identifier,
    name: types.string,
    duration: types.number, // in seconds
    category: types.string,
    remainingTime: types.optional(types.number, 0),
    status: types.optional(
      types.enumeration("Status", ["idle", "running", "paused", "completed"]),
      "idle",
    ),
    completionAcknowledged: types.optional(types.boolean, false),
    isHalfwayAlertEnabled: types.optional(types.boolean, false),
    halfwayAlertTriggered: types.optional(types.boolean, false),
    createdAt: types.Date, // types.Date can handle timestamps (numbers)
  })
  .volatile(() => ({
    intervalId: undefined as NodeJS.Timeout | undefined,
  }))
  .actions((self) => {
    function _clearTimerInterval() {
      if (self.intervalId) {
        clearInterval(self.intervalId)
        self.intervalId = undefined
      }
    }

    return {
      // Important: Actions modifying self should be here
      setName(newName: string) {
        self.name = newName
      },
      setDuration(seconds: number) {
        self.duration = seconds
        if (self.status === "idle" || self.status === "completed") {
          // Only reset remaining if not active
          self.remainingTime = seconds
        }
      },
      setCategory(newCategory: string) {
        self.category = newCategory
      },
      // ... other actions from before ...
      start() {
        if (self.status === "running" || self.status === "completed") return
        if (self.status === "idle") {
          self.remainingTime = self.duration
          self.halfwayAlertTriggered = false
        }
        self.status = "running"
        _clearTimerInterval()
        self.intervalId = setInterval(() => {
          this.tick()
        }, 1000)
      },
      pause() {
        if (self.status !== "running") return
        self.status = "paused"
        _clearTimerInterval()
      },
      reset() {
        _clearTimerInterval()
        self.status = "idle"
        self.remainingTime = self.duration
        self.halfwayAlertTriggered = false
        self.completionAcknowledged = false
      },
      tick() {
        if (self.remainingTime > 0) {
          self.remainingTime -= 1
          if (
            self.isHalfwayAlertEnabled &&
            !self.halfwayAlertTriggered &&
            self.remainingTime > 0 &&
            self.remainingTime <= self.duration / 2
          ) {
            self.halfwayAlertTriggered = true
          }
        } else {
          this.complete()
        }
      },
      complete() {
        _clearTimerInterval()
        if (self.status !== "completed") {
          self.status = "completed"
          self.remainingTime = 0
          self.completionAcknowledged = false
        }
      },
      toggleHalfwayAlert(enabled: boolean) {
        self.isHalfwayAlertEnabled = enabled
        if (!enabled) {
          self.halfwayAlertTriggered = false
        }
      },
      acknowledgeCompletion() {
        // New action
        if (self.status === "completed") {
          self.completionAcknowledged = true
        }
      },
      // Lifecycle hook
      beforeDestroy() {
        _clearTimerInterval()
      },
    }
  })
  .views((self) => ({
    get progress() {
      if (self.duration === 0) return 0
      return (self.duration - self.remainingTime) / self.duration
    },
    get formattedRemainingTime() {
      const minutes = Math.floor(self.remainingTime / 60)
      const seconds = self.remainingTime % 60
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    },
    // View to get createdAt as a Date object if needed for display
    get createdAtDate(): Date {
      return new Date(self.createdAt) // self.createdAt is already a Date object due to types.Date
    },
  }))

export interface Timer extends Instance<typeof TimerModel> {}

export interface TimerSnapshotIn extends SnapshotIn<typeof TimerModel> {} // Make sure this is exported
export interface TimerSnapshotOut extends SnapshotOut<typeof TimerModel> {}
