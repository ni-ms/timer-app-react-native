import { View, StyleSheet } from "react-native"
import { colors } from "app/theme"
// eslint-disable-next-line no-restricted-imports
import React from "react"

interface ProgressBarProps {
  progress: number // 0 to 1
  height?: number
  color?: string
  backgroundColor?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  color = colors.tint,
  backgroundColor = colors.palette.neutral400,
}) => {
  return (
    <View style={[$barStyles.background, { height, backgroundColor }]}>
      <View
        style={[
          $barStyles.fill,
          { width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  )
}

const $barStyles = StyleSheet.create({
  background: {
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 4,
    height: "100%",
  },
})
