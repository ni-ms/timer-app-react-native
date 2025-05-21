// eslint-disable-next-line no-restricted-imports
import React, { FC, useState } from "react"
import { observer } from "mobx-react-lite"
import { HomeStackScreenProps } from "app/navigators" // Corrected import
import { Screen, Text, TextField, Button, Radio } from "app/components" // Assuming Toggle for halfway alert
import { useStores } from "app/models"
import { View, Alert, ViewStyle, TextStyle } from "react-native"
import { useAppTheme } from "@/utils/useAppTheme"

// If you want a picker for categories:
// import { Picker } from '@react-native-picker/picker'; // npm i @react-native-picker/picker

interface AddTimerScreenProps extends HomeStackScreenProps<"AddTimer"> {
}

export const AddTimerScreen: FC<AddTimerScreenProps> = observer(function AddTimerScreen(_props) {
  const { navigation } = _props
  const rootStore = useStores()
  const { addTimer, availableCategories, addNewCategory } = rootStore // Destructure from rootStore
  const { theme, themeContext, setThemeContextOverride } = useAppTheme()

  const $container: ViewStyle = { padding: theme.spacing.md }
  const $header: TextStyle = { marginBottom: theme.spacing.lg, textAlign: "center" }
  const $textField: ViewStyle = { marginBottom: theme.spacing.md }
  const $label: TextStyle = { marginBottom: theme.spacing.xs, color: theme.colors.text }
  const $categoryButton: ViewStyle = { marginBottom: theme.spacing.sm }
  const $toggleContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: theme.spacing.md,
  }
  const $saveButton: ViewStyle = { marginTop: theme.spacing.lg }

  const [name, setName] = useState("")
  const [duration, setDuration] = useState("") // Store as string for input
  const [category, setCategory] = useState(availableCategories[0] || "")
  const [customCategory, setCustomCategory] = useState("")
  const [isHalfwayAlertEnabled, setIsHalfwayAlertEnabled] = useState(false)

  const handleSave = () => {
    const numDuration = parseInt(duration, 10)
    if (!name.trim() || isNaN(numDuration) || numDuration <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid name and duration.")
      return
    }
    const finalCategory = customCategory.trim() || category
    if (!finalCategory.trim()) {
      Alert.alert("Invalid Input", "Please select or enter a category.")
      return
    }
    if (customCategory.trim()) {
      addNewCategory(customCategory.trim())
    }

    addTimer({ name, duration: numDuration, category: finalCategory, isHalfwayAlertEnabled })
    navigation.goBack()
  }

  return (
    <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top", "bottom"]}>
      <Text preset="heading" text="Add New Timer" style={$header} />

      <TextField
        label="Timer Name"
        placeholder="e.g., Morning Workout"
        value={name}
        onChangeText={setName}
        containerStyle={$textField}
      />
      <TextField
        label="Duration (seconds)"
        placeholder="e.g., 300"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
        containerStyle={$textField}
      />

      {/* Simple Category Input for now, or use Picker */}
      <Text text="Category" preset="formLabel" style={$label} />
      {/* This is a basic way to handle categories. A Picker or custom dropdown would be better */}
      {availableCategories.map((cat: React.Key | null | undefined) => (
        <Button
          key={cat}
          text={cat ? cat.toString() : "Unknown"}
          preset={category === cat ? "filled" : "default"}
          onPress={() => {
            setCategory(cat?.toString() || "")
            setCustomCategory("")
          }}
          style={$categoryButton}
        />
      ))}
      <TextField
        label="Or New Category"
        placeholder="e.g., Reading"
        value={customCategory}
        onChangeText={setCustomCategory}
        containerStyle={$textField}
        onFocus={() => setCategory("")} // Clear selection if typing custom
      />

      <View style={$toggleContainer}>
        <Text text="Enable Halfway Alert?" style={$label} />
        <Radio
          value={isHalfwayAlertEnabled}
          onValueChange={() => setIsHalfwayAlertEnabled(!isHalfwayAlertEnabled)}
          inputOuterStyle={{ borderColor: isHalfwayAlertEnabled ? theme.colors.tint : theme.colors.tintInactive }}
        />
      </View>

      <Button text="Save Timer" preset="reversed" onPress={handleSave} style={$saveButton} />
    </Screen>
  )
})


// Example for Picker:
// <Picker
//   selectedValue={category}
//   onValueChange={(itemValue) => setCategory(itemValue)}
// >
//   {availableCategories.map(cat => <Picker.Item key={cat} label={cat} value={cat} />)}
// </Picker>
// <TextField label="New Category (optional)" ... />
