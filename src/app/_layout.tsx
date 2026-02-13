import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="qr-scanner" options={{ title: "Scan Bio QR" }} />
      <Stack.Screen name="face-scanner" options={{ title: "Scan Face" }} />
    </Stack>
  );
}
