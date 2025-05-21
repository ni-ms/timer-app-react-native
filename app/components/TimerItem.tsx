// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-restricted-imports
import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, StyleSheet, TextStyle, ViewStyle, Alert, TouchableOpacity } from "react-native"
import { Text, Button, Card, Icon } from "app/components"
import { Timer } from "app/models" // Make sure Timer is exported from app/models
import { ProgressBar } from "./ProgressBar"
import { useAppTheme } from "@/utils/useAppTheme" // Import your ProgressBar

interface TimerItemProps {
  timer: Timer
  onComplete: (timerName: Timer) => void // For completion modal
  onHalfway: (timerName: string) => void // For halfway modal/alert
  onDelete: (timerName: Timer) => void
}

export const TimerItem: FC<TimerItemProps> = observer(
  ({ timer, onComplete, onHalfway, onDelete }) => {
    // Reaction for completion
    useEffect(() => {
      if (timer.status === "completed" && !timer.completionAcknowledged) {
        onComplete(timer) // Pass the timer instance
      }
    }, [timer.status, timer.completionAcknowledged, timer, onComplete])

    const [halfwayAlertShownForThisRun, setHalfwayAlertShownForThisRun] = useState(false)
    // Effect for halfway alert
    useEffect(() => {
      if (
        timer.isHalfwayAlertEnabled &&
        timer.halfwayAlertTriggered && // The flag from the model is true
        !halfwayAlertShownForThisRun && // BUT we haven't shown our local alert yet for this run
        timer.status === "running" &&
        timer.remainingTime > 0 // Still relevant to show (not completed immediately after)
      ) {
        onHalfway(timer.name)
        setHalfwayAlertShownForThisRun(true) // Mark as shown for this specific trigger
      }

      // Reset the local 'shown' flag if the timer's halfwayAlertTriggered flag is reset
      // (which happens in TimerModel's start() or reset() actions)
      // OR if the timer is no longer running (e.g., paused, reset, completed)
      if (!timer.halfwayAlertTriggered || timer.status !== "running") {
        if (halfwayAlertShownForThisRun) {
          // Only set state if it actually changes
          setHalfwayAlertShownForThisRun(false)
        }
      }
    }, [
      timer.isHalfwayAlertEnabled,
      timer.halfwayAlertTriggered,
      timer.status,
      timer.remainingTime, // Added remainingTime to dependencies for the > 0 check
      timer.name, // For onHalfway
      onHalfway,
      halfwayAlertShownForThisRun, // Dependency for the local state
    ])

    const handleDelete = () => {
      // Optional: Add a confirmation dialog before deleting
      Alert.alert(
        "Delete Timer",
        `Are you sure you want to delete "${timer.name}"? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: () => onDelete(timer), // Call the onDelete prop
            style: "destructive",
          },
        ],
        { cancelable: true },
      )
    }
    // Reaction for halfway alert
    useEffect(() => {
      // Only trigger if it just became true and was enabled
      if (
        timer.isHalfwayAlertEnabled &&
        timer.halfwayAlertTriggered &&
        timer.remainingTime > 0 &&
        timer.status === "running"
      ) {
        // Check a flag on the timer or use a local state to ensure it only fires once per trigger
        // The model's `halfwayAlertTriggered` handles this mostly
        onHalfway(timer.name)
      }
    }, [
      timer.halfwayAlertTriggered,
      timer.isHalfwayAlertEnabled,
      timer.name,
      onHalfway,
      timer.status,
      timer.remainingTime,
    ])

    const { theme, themeContext, setThemeContextOverride } = useAppTheme()

    const $card: ViewStyle = { marginVertical: theme.spacing.xs, padding: theme.spacing.sm }
    const $headerRow: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    }
    const $timerName: TextStyle = { flex: 1, fontWeight: "bold" }
    const $statusText: TextStyle = {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      borderRadius: 4,
      overflow: "hidden",
      color: theme.colors.text,
    }
    const $status = StyleSheet.create<{ [key: string]: TextStyle }>({
      completed: { backgroundColor: theme.colors.palette.neutral500 },
      idle: { backgroundColor: theme.colors.palette.neutral500 },
      paused: { backgroundColor: theme.colors.palette.neutral500 },
      running: { backgroundColor: theme.colors.palette.neutral500 },
    })
    const $timeText: TextStyle = { marginBottom: theme.spacing.sm, fontSize: 16 }
    const $controls: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: theme.spacing.sm,
    }
    const $button: ViewStyle = { paddingHorizontal: theme.spacing.sm, minHeight: 36 }
    const $buttonText: TextStyle = { fontSize: 14 }
    const $deleteButton: ViewStyle = {
      // Style for the delete button
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    }

    return (
      <Card
        style={$card}
        ContentComponent={
          <>
            <View style={$headerRow}>
              <Text preset="subheading" text={timer.name} style={$timerName} />
              <TouchableOpacity onPress={handleDelete} style={$deleteButton}>
                <Icon icon="delete" size={20} color={theme.colors.tint} />
              </TouchableOpacity>
              <Text
                text={timer.status.toUpperCase()}
                style={[$statusText, $status[timer.status]]}
              />
            </View>
            <Text text={`Time: ${timer.formattedRemainingTime}`} style={$timeText} />
            <ProgressBar progress={timer.progress} />
            <View style={$controls}>
              {timer.status !== "running" && (
                <Button
                  onPress={() => timer.start()}
                  text="Start"
                  preset="filled"
                  style={$button}
                  textStyle={$buttonText}
                />
              )}
              {timer.status === "running" && (
                <Button
                  onPress={() => timer.pause()}
                  text="Pause"
                  preset="default"
                  style={$button}
                  textStyle={$buttonText}
                />
              )}
              <Button
                onPress={() => timer.reset()}
                text="Reset"
                preset="default"
                style={$button}
                textStyle={$buttonText}
              />
            </View>
          </>
        }
      />
    )
  },
)
