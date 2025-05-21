import React, { FC } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, View, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { AppTabScreenProps } from "app/navigators"
import { Screen, Text, Card } from "app/components"
import { useStores } from "app/models"
import { format } from "date-fns"
import { useAppTheme } from "@/utils/useAppTheme"

interface HistoryScreenProps extends AppTabScreenProps<"History"> {}

export const HistoryScreen: FC<HistoryScreenProps> = observer(function HistoryScreen(_props) {
  const rootStore = useStores()
  const { sortedTimerLogs } = rootStore
  const { theme, themeContext, setThemeContextOverride } = useAppTheme()

  const $container: ViewStyle = { flex: 1, backgroundColor: theme.colors.background }
  const $header: TextStyle = {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    textAlign: "center",
    color: theme.colors.text,
  }
  const $logCard: ViewStyle = {
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
  }
  const $listContent: ViewStyle = {
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  }
  const $emptyState: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  }
  const $blankText: TextStyle = { textAlign: "center", color: theme.colors.text }

  return (
    <Screen preset="fixed" contentContainerStyle={$container} safeAreaEdges={["top"]}>
      <Text preset="heading" text="Timer History" style={$header} />

      {sortedTimerLogs.length === 0 && (
        <View style={$emptyState}>
          <Text style={$blankText} text="No completed timers yet." />
        </View>
      )}

      <FlatList
        data={sortedTimerLogs.slice()} // Use slice() for mobx array observability in FlatList
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            style={$logCard}
            heading={item.timerName}
            content={`Completed: ${format(new Date(item.completedAt), "MMM d, yyyy 'at' h:mm a")}`}
            RightComponent={<Text text={`${item.duration}s`} preset="bold" />}
          />
        )}
        contentContainerStyle={$listContent}
      />
    </Screen>
  )
})
