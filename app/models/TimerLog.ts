import {
  Instance as LogInstance,
  SnapshotIn as LogSnapshotIn,
  SnapshotOut as LogSnapshotOut,
  types as logTypes,
} from "mobx-state-tree"

export const TimerLogModel = logTypes
  .model("TimerLog")
  .props({
    id: logTypes.identifier,
    timerName: logTypes.string,
    completedAt: logTypes.Date, // types.Date can handle timestamps
    duration: logTypes.number,
  })
  .views((self) => ({
    get completedAtDate(): Date {
      return new Date(self.completedAt) // self.completedAt is already a Date object
    },
  }))

export interface TimerLog extends LogInstance<typeof TimerLogModel> {}

export interface TimerLogSnapshotIn extends LogSnapshotIn<typeof TimerLogModel> {} // Export this
export interface TimerLogSnapshotOut extends LogSnapshotOut<typeof TimerLogModel> {}
