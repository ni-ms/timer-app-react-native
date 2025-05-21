// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-restricted-imports
import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, TouchableOpacity, TextStyle, ViewStyle } from "react-native"
import { Text, Button, Icon } from "app/components"
import { Timer, useStores } from "app/models"
import { TimerItem } from "./TimerItem"
import { useAppTheme } from "@/utils/useAppTheme"

interface CategorySectionProps {
  categoryName: string
  timers: Timer[]
  onTimerComplete: (timerName: Timer) => void
  onTimerHalfway: (timerName: string) => void
  onTimerDelete: (timerName: Timer) => void
}

export const CategorySection: FC<CategorySectionProps> = observer(
  ({ categoryName, timers, onTimerComplete, onTimerHalfway, onTimerDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true)
    const rootStore = useStores()

    if (!timers || timers.length === 0) return null

    const { theme, themeContext, setThemeContextOverride } = useAppTheme()

    const $categoryContainer: ViewStyle = {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      padding: theme.spacing.sm,
    }
    const $categoryHeader: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    }
    const $categoryTitle: TextStyle = { fontSize: 18 }
    const $bulkActions: ViewStyle = {
      flexDirection: "row",
      justifyContent: "space-around",
      marginVertical: theme.spacing.sm,
    }
    const $bulkButton: ViewStyle = {
      paddingHorizontal: theme.spacing.xs,
      flex: 1,
      marginHorizontal: theme.spacing.xxs,
    }

    return (
      <View style={$categoryContainer}>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={$categoryHeader}>
          <Text preset="bold" text={categoryName} style={$categoryTitle} />
          <Icon icon={isExpanded ? "caretLeft" : "caretRight"} size={20} />
        </TouchableOpacity>

        {isExpanded && (
          <>
            <View style={$bulkActions}>
              <Button
                text="Start All"
                onPress={() => rootStore.startCategoryTimers(categoryName)}
                style={$bulkButton}
                preset="default"
              />
              <Button
                text="Pause All"
                onPress={() => rootStore.pauseCategoryTimers(categoryName)}
                style={$bulkButton}
                preset="default"
              />
              <Button
                text="Reset All"
                onPress={() => rootStore.resetCategoryTimers(categoryName)}
                style={$bulkButton}
                preset="default"
              />
            </View>
            {timers.map((timer) => (
              <TimerItem
                key={timer.id}
                timer={timer}
                onComplete={onTimerComplete}
                onHalfway={onTimerHalfway}
                onDelete={onTimerDelete}
              />
            ))}
          </>
        )}
      </View>
    )
  },
)
