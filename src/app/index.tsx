import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>

      <TouchableOpacity
        style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "cyan", borderRadius: 8 }}
        onPress={() => router.navigate("/camera")}
      >
        <Text>
          Open AI Camera
        </Text>
      </TouchableOpacity>
    </View>
  );
}
