// app/screens/TimerListScreen.tsx

// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-restricted-imports
import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, View, Modal, Alert, TextStyle, ViewStyle } from "react-native"
import { HomeStackScreenProps } from "app/navigators"
import { Screen, Text, Button, Icon } from "app/components"
import { useStores, Timer } from "app/models" // Ensure Timer type is imported from your main models index or Timer.ts
import { CategorySection } from "app/components/CategorySection"
import { comparer, reaction } from "mobx"
import { useAppTheme } from "@/utils/useAppTheme"

interface TimerListScreenProps extends HomeStackScreenProps<"TimerList"> {}

export const TimerListScreen: FC<TimerListScreenProps> = observer(function TimerListScreen(_props) {
  const { navigation } = _props
  const rootStore = useStores() // Assuming useStores() gives IStructuredTimerStore or similar
  const { timersByCategory, categories, addTimerLog, removeTimer } = rootStore // Destructure persistTimers

  const [completedModalVisible, setCompletedModalVisible] = useState(false)
  // Store the actual Timer instance that completed, not just the name
  const [currentCompletedTimer, setCurrentCompletedTimer] = useState<Timer | null>(null)

  // Halfway alert state (kept as is from your original code)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [halfwayAlertVisible, setHalfwayAlertVisible] = useState(false) // Keep if you plan to use a modal for this
  const [halfwayTimerName, setHalfwayTimerName] = useState("")

  //STYLES
  const { theme, themeContext, setThemeContextOverride } = useAppTheme()

  const $container: ViewStyle = { flex: 1, backgroundColor: theme.colors.background }
  const $headerContainer: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  }
  const $addButton: ViewStyle = {
    width: theme.spacing.xs * 2, // Adjust as needed
    height: theme.spacing.xs * 2, // Same as width to maintain square shape
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.transparent,
  }

  const $listContent: ViewStyle = {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  }
  const $emptyState: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  }
  const $modalCenteredView: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  }
  const $modalView: ViewStyle = {
    margin: theme.spacing.md,
    // Use a color from your theme for modal background if `colors.background` is too dark/light
    backgroundColor: theme.colors.palette.accent500 || theme.colors.background, // Or a specific modal background color
    borderRadius: 20,
    padding: theme.spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  }
  const $modalText: TextStyle = {
    marginBottom: theme.spacing.md,
    textAlign: "center",
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  }

  // Reaction to add completed timers to log
  useEffect(() => {
    const disposer = reaction(
      () =>
        rootStore.timers.filter(
          // No need for explicit types here if rootStore.timers is typed as Timer[]
          (t) => t.status === "completed" && t.remainingTime === 0,
        ),
      (currentCompletedTimersInStore, previousCompletedTimersInStore) => {
        const newlyCompleted = currentCompletedTimersInStore.filter(
          (ct) =>
            !previousCompletedTimersInStore.find(
              (pct) => pct.id === ct.id && pct.status === "completed",
            ),
        )
        newlyCompleted.forEach((timer) => {
          console.log(
            `[TimerListScreen Reaction] Timer "${timer.name}" newly completed. Adding to log.`,
          )
          addTimerLog(timer) // Pass the Timer instance
        })
      },
      { fireImmediately: false, equals: comparer.structural },
    )
    return () => {
      console.log("[TimerListScreen Reaction] Disposing completion reaction.")
      disposer()
    }
  }, [rootStore.timers, addTimerLog]) // rootStore.timers changes will trigger this

  // Called by TimerItem when a timer completes and is not yet acknowledged
  const handleTimerComplete = (timer: Timer) => {
    // The check for !timer.completionAcknowledged is now primarily in TimerItem's useEffect
    // This handler just needs to show the modal if it's not already up for another timer.
    if (!completedModalVisible) {
      console.log(`[TimerListScreen] Modal being shown for completed timer: ${timer.name}`)
      setCurrentCompletedTimer(timer)
      setCompletedModalVisible(true)
    } else {
      console.log(`[TimerListScreen] Modal already visible, not showing for: ${timer.name}`)
    }
  }

  // Handles closing the modal and acknowledging the timer completion
  const handleAcknowledgeAndCloseModal = () => {
    if (currentCompletedTimer) {
      console.log(`[TimerListScreen] Acknowledging completion for: ${currentCompletedTimer.name}`)
      currentCompletedTimer.acknowledgeCompletion() // Call MST action on the Timer model
      // persistTimers() // Persist the change to completionAcknowledged
    }
    setCompletedModalVisible(false)
    setCurrentCompletedTimer(null)
  }

  const handleTimerHalfway = (timerName: string) => {
    setHalfwayTimerName(timerName)
    Alert.alert("Halfway Point!", `Timer "${timerName}" has reached its halfway mark.`)
  }
  const handleTimerDelete = (timerToDelete: Timer) => {
    console.log(`[TimerListScreen] Deleting timer: ${timerToDelete.name}`)
    removeTimer(timerToDelete) // Call the action on the root store
    // No need to call saveTimers() here, as removeTimer in RootStore already does.
  }

  return (
    <Screen preset="fixed" contentContainerStyle={$container} safeAreaEdges={["top"]}>
      <View style={$headerContainer}>
        <Text preset="heading" text="My Timers" />
        <Button onPress={() => navigation.navigate("AddTimer")} style={$addButton}>
          <Icon icon="add" color={theme.colors.tint} size={24} /> {/* Changed icon to plus */}
        </Button>
      </View>

      {categories.length === 0 &&
        !rootStore.timers.length && ( // Check timers array length too
          <View style={$emptyState}>
            <Text text="No timers yet. Add one to get started!" />
          </View>
        )}

      <FlatList
        data={categories.slice()} // Use .slice() for FlatList with MobX observable arrays
        keyExtractor={(item) => item}
        renderItem={({ item: categoryName }) => (
          <CategorySection
            categoryName={categoryName}
            timers={timersByCategory[categoryName]}
            onTimerComplete={handleTimerComplete} // Passed from here
            onTimerHalfway={handleTimerHalfway}
            onTimerDelete={handleTimerDelete}
          />
        )}
        contentContainerStyle={$listContent}
        extraData={rootStore.timers.length} // Helps FlatList re-render if timers array changes
      />

      {/* Completion Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={completedModalVisible}
        onRequestClose={handleAcknowledgeAndCloseModal} // Important for Android back button
      >
        <View style={$modalCenteredView}>
          <View style={$modalView}>
            <Text preset="subheading" text="Congratulations!" style={$modalText} />
            <Text
              text={`Timer "${currentCompletedTimer?.name}" has completed!`}
              style={$modalText}
            />
            <Button text="Awesome!" preset="reversed" onPress={handleAcknowledgeAndCloseModal} />
          </View>
        </View>
      </Modal>
    </Screen>
  )
})
