// app/screens/SettingsScreen.tsx
import React, { FC } from "react"
import { View, Alert, Platform, ViewStyle, TextStyle } from "react-native" // Removed ScrollView, StyleSheet
import { AppTabScreenProps } from "app/navigators" // Assuming it's a tab screen now
import { Screen, Text, Button, Icon } from "app/components"
import { useStores, RootStore } from "app/models" // Import RootStore type if needed
import { getSnapshot, SnapshotIn } from "mobx-state-tree"
import { TimerModel, TimerSnapshotIn } from "app/models/Timer" // Import TimerModel and TimerSnapshotIn

// Import file system and sharing libraries
import DocumentPicker, { DocumentPickerResponse } from "react-native-document-picker"
import Share from "react-native-share"
import RNFS from "react-native-fs"
import { useAppTheme } from "@/utils/useAppTheme" // Assuming this path is correct

// Update props if Settings is now a tab
interface SettingsScreenProps extends AppTabScreenProps<"Settings"> {}

export const SettingsScreen: FC<SettingsScreenProps> = (_props) => {
  // const { navigation } = _props; // navigation is available if needed
  const rootStore: RootStore = useStores() // Explicitly type if useStores is generic
  const { theme, themeContext, setThemeContextOverride } = useAppTheme()

  const handleExportTimers = async () => {
    // Renamed function
    try {
      if (rootStore.timers.length === 0) {
        // Check active timers
        Alert.alert("No Timers", "There are no active timers to export.")
        return
      }
      // Export the snapshot of the current active timers
      const jsonTimers = JSON.stringify(getSnapshot(rootStore.timers), null, 2)
      const fileName = `timer_configs_${Date.now()}.json` // Changed file name
      const path = `${RNFS.DocumentDirectoryPath}/${fileName}`
      await RNFS.writeFile(path, jsonTimers, "utf8")
      const url = Platform.OS === "android" ? `file://${path}` : path

      await Share.open({
        title: "Export Timer Configurations", // Updated title
        url: url,
        type: "application/json",
        failOnCancel: false,
        subject: "Timer Configurations Export", // Updated subject
      })
      console.log("Timer configurations export successful, path:", path)
    } catch (error: any) {
      console.error("Timer configurations export failed:", error)
      if (!(error.message && error.message.includes("User did not share"))) {
        Alert.alert("Export Failed", "Could not export timer configurations. " + error.message)
      } else {
        console.log("User cancelled sharing or export.")
      }
    }
  }

  const handleImportTimers = async () => {
    // Renamed function
    try {
      const resArray: DocumentPickerResponse[] | undefined = await DocumentPicker.pick({
        type: [DocumentPicker.types.json],
        copyTo: "cachesDirectory",
      })

      if (resArray && resArray.length > 0) {
        const file = resArray[0]
        const filePath = file.fileCopyUri

        if (!filePath) {
          Alert.alert("Import Error", "Could not get file path from picker result.")
          return
        }

        const fileContents = await RNFS.readFile(filePath, "utf8")
        // Expecting an array of TimerSnapshotIn
        const importedTimerSnapshots = JSON.parse(fileContents) as TimerSnapshotIn[]

        if (Array.isArray(importedTimerSnapshots)) {
          // Use the action from RootStore for robust import
          const importedCount = rootStore.addImportedTimers(importedTimerSnapshots)
          if (importedCount > 0) {
            Alert.alert("Import Successful", `${importedCount} new timer(s) imported and saved.`)
          } else {
            Alert.alert(
              "Import Info",
              "No new timers to import or all timers already exist (by ID).",
            )
          }
        } else {
          Alert.alert("Import Failed", "Invalid JSON file format for timer configurations.")
        }
      }
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        console.log("User cancelled the document picker")
      } else {
        console.error("Import error:", err)
        Alert.alert(
          "Import Failed",
          "Could not import timer configurations. " + (err.message || "Unknown error"),
        )
      }
    }
  }

  const cycleTheme = () => {
    const nextMode = themeContext === "light" ? "dark" : "light"
    setThemeContextOverride(nextMode)
  }



  // Styles using the theme (same as before)
  const $screenContentContainer: ViewStyle = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    flex: 1,
  }
  const $sectionTitle: TextStyle = {
    // ...theme.typography.primary, // Assuming primary exists in your typography
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  }
  const $buttonStyle: ViewStyle = {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
  }
  const $buttonTextStyle: TextStyle = {
    color: theme.colors.text,
  }

  return (
    <Screen
      preset="scroll"
      contentContainerStyle={$screenContentContainer}
      safeAreaEdges={["bottom"]}
    >
      <Text
        preset="heading"
        text="Settings"
        style={{ color: theme.colors.text, marginBottom: theme.spacing.lg, textAlign: "center" }}
      />

      <Text style={$sectionTitle}>Data Management (Timers)</Text>
      <Button
        text="Import Timers" // Updated text
        onPress={handleImportTimers} // Updated handler
        style={$buttonStyle}
        textStyle={$buttonTextStyle}
        LeftAccessory={(props) => (
          <Icon containerStyle={props.style} icon="download" color={theme.colors.text} />
        )}
      />
      <Button
        text="Export Timers" // Updated text
        onPress={handleExportTimers} // Updated handler
        style={$buttonStyle}
        textStyle={$buttonTextStyle}
        LeftAccessory={(props) => (
          <Icon containerStyle={props.style} icon="upload" color={theme.colors.text} />
        )}
      />

      <Text style={$sectionTitle}>Appearance</Text>
      <Button
        text={`Theme: ${themeContext?.charAt(0).toUpperCase() + themeContext.slice(1)}`}
        onPress={cycleTheme}
        style={$buttonStyle}
        textStyle={$buttonTextStyle}
        LeftAccessory={(props) => (
          <Icon
            containerStyle={props.style}
            icon={themeContext === "dark" ? "dark" : "light"}
            color={theme.colors.text}
          />
        )}
      />
    </Screen>
  )
}
