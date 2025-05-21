/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator, NativeStackScreenProps } from "@react-navigation/native-stack"
import { observer } from "mobx-react-lite"
import * as Screens from "@/screens"
import Config from "../config"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { useThemeProvider } from "@/utils/useAppTheme"
import { ComponentProps } from "react"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Icon } from "@/components"
import { colors } from "app/theme"

/**
 * This type allows TypeScript to know what routes are defined in this navigator
 * as well as what properties (if any) they might take when navigating to them.
 *
 * If no params are allowed, pass through `undefined`. Generally speaking, we
 * recommend using your MobX-State-Tree store(s) to keep application state
 * rather than passing state through navigation params.
 *
 * For more information, see this documentation:
 *   https://reactnavigation.org/docs/params/
 *   https://reactnavigation.org/docs/typescript#type-checking-the-navigator
 *   https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AppStackParamList = {
  HomeTab: undefined
  Login: undefined
  // 🔥 Your screens go here
  TimerList: undefined
  AddTimer: undefined
  History: undefined
  Settings: undefined
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}
export type HomeStackParamList = {
  TimerList: undefined
  AddTimer: undefined
}

export type AppTabParamList = {
  Home: undefined // This is the stack for timers
  History: undefined
  Settings: undefined
}
/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>
export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>
export type AppTabScreenProps<T extends keyof AppTabParamList> = NativeStackScreenProps<
  // Can use BottomTabScreenProps if you need tab specific props
  AppTabParamList,
  T
>

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()
const HomeStackNavigator = createNativeStackNavigator<HomeStackParamList>()
const Tab = createBottomTabNavigator<AppTabParamList>()
const HomeStack = () => (
  <HomeStackNavigator.Navigator screenOptions={{ headerShown: false }} initialRouteName="TimerList">
    <HomeStackNavigator.Screen name="TimerList" component={Screens.TimerListScreen} />
    <HomeStackNavigator.Screen name="AddTimer" component={Screens.AddTimerScreen} />
  </HomeStackNavigator.Navigator>
)
const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false, // Or true if you want headers per tab
      tabBarActiveTintColor: colors.tint,
      tabBarInactiveTintColor: colors.tint,
      tabBarIcon: ({ color, size }) => {
        let iconName: "home" | "history" | "settings" = "home" // Update with your Icon component's names
        if (route.name === "Home") {
          iconName = "home"
        } else if (route.name === "History") {
          iconName = "history"
        } else if (route.name === "Settings") {
          // Handle Settings icon
          iconName = "settings"
        }
        return <Icon icon={iconName} size={size} color={color} />
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} options={{ title: "Timers" }} />
    <Tab.Screen name="History" component={Screens.HistoryScreen} options={{ title: "History" }} />
    <Tab.Screen
      name="Settings"
      component={Screens.SettingsScreen}
      options={{ title: "Settings", headerShown: true }}
    />
  </Tab.Navigator>
)

const AppStack = observer(function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeTab" // Default to the Tab navigator
    >
      <Stack.Screen name="HomeTab" component={AppTabs} />
      {/** Add other global screens like a modal outside of tabs here if needed */}
    </Stack.Navigator>
  )
})

export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}

export const AppNavigator = observer(function AppNavigator(props: NavigationProps) {
  const { themeScheme, navigationTheme, setThemeContextOverride, ThemeProvider } =
    useThemeProvider()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
        <AppStack />
      </NavigationContainer>
    </ThemeProvider>
  )
})
