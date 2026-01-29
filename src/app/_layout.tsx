import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Welcome" }} />
      <Stack.Screen name="camera" options={{ title: "AI Camera" }} />
      <Stack.Screen name="face-detection-cam" options={{ title: "Face Detection Camera" }} />
      <Stack.Screen name="face-detection-image" options={{ title: "Face Detection Gallery" }} />
    </Stack>
  );
}
