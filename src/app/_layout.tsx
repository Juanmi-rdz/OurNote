import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ProveedorTema, useTema } from "../lib/tema";

function Navegacion() {
  const { c, esOscuro } = useTema();
  // undefined = todavía comprobando si hay sesión guardada
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  if (user === undefined) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: c.fondo,
        }}
      >
        <StatusBar style={esOscuro ? "light" : "dark"} />
        <ActivityIndicator color={c.primario} />
      </View>
    );
  }

  const logueado = !!user;

  return (
    <>
      <StatusBar style={esOscuro ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.fondo },
          headerTintColor: c.primario,
          headerTitleStyle: { color: c.texto },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.fondo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Protected guard={logueado}>
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="ajustes" />
          <Stack.Screen name="grupo/[id]" />
          <Stack.Screen name="nota/[grupoId]/[notaId]" />
          <Stack.Screen name="ajustes-grupo/[id]" />
        </Stack.Protected>

        <Stack.Protected guard={!logueado}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ProveedorTema>
      <Navegacion />
    </ProveedorTema>
  );
}