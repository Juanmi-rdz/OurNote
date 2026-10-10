import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { borrarCuenta, guardarMiNombre } from "../lib/cuenta";
import { useTema } from "../lib/tema";
import {
  Boton,
  Campo,
  SelectorColor,
  SelectorTema,
  Texto,
} from "../components/ui";

export default function Ajustes() {
  const { c } = useTema();
  const u = auth.currentUser;
  const [nombre, setNombre] = useState(
    u?.displayName ?? (u?.email ?? "").split("@")[0]
  );
  const [aviso, setAviso] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!u) return null;

  const guardarNombre = async () => {
    const n = nombre.trim();
    if (!n) return;
    try {
      await guardarMiNombre(n);
      setAviso("Nombre guardado ✓");
    } catch {
      setAviso("No se pudo guardar. Inténtalo de nuevo.");
    }
  };

  // Al cerrar sesión, el layout te lleva solo al login
  const salir = () => signOut(auth);

  const confirmarBorrado = () =>
    Alert.alert(
      "Borrar cuenta",
      "Saldrás de todos tus grupos y se eliminará tu cuenta. Los grupos en los que seas el único miembro se borrarán con todas sus notas. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            try {
              setError("");
              await borrarCuenta(password);
            } catch (e: any) {
              setError(
                e?.code === "auth/invalid-credential" ||
                  e?.code === "auth/wrong-password"
                  ? "Contraseña incorrecta."
                  : "No se pudo borrar la cuenta. Inténtalo de nuevo."
              );
            }
          },
        },
      ]
    );

  const titulo = {
    color: c.suave,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 26,
    marginBottom: 8,
  } as const;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Ajustes" }} />

      <Texto style={{ ...titulo, marginTop: 0 }}>TU NOMBRE</Texto>
      <Campo value={nombre} onChangeText={setNombre} />
      <Boton
        titulo="Guardar nombre"
        tipo="suave"
        onPress={guardarNombre}
        style={{ marginTop: 10 }}
      />
      {aviso ? (
        <Texto style={{ color: c.suave, textAlign: "center", marginTop: 8 }}>
          {aviso}
        </Texto>
      ) : null}

      <Texto style={titulo}>APARIENCIA</Texto>
      <SelectorTema />

      <Texto style={titulo}>COLOR DE LA APP</Texto>
      <SelectorColor />

      <Texto style={titulo}>CUENTA</Texto>
      <Texto style={{ color: c.suave, marginBottom: 10 }}>{u.email}</Texto>
      <Boton titulo="Cerrar sesión" tipo="suave" onPress={salir} />

      <Texto style={titulo}>ZONA PELIGROSA</Texto>
      {borrando ? (
        <>
          <Texto style={{ color: c.suave, marginBottom: 8 }}>
            Escribe tu contraseña para confirmar:
          </Texto>
          <Campo
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? (
            <Texto style={{ color: c.peligro, marginTop: 8 }}>{error}</Texto>
          ) : null}
          <Boton
            titulo="Borrar mi cuenta definitivamente"
            tipo="peligro"
            onPress={confirmarBorrado}
            style={{ marginTop: 10 }}
          />
          <Boton
            titulo="Cancelar"
            tipo="texto"
            onPress={() => {
              setBorrando(false);
              setPassword("");
              setError("");
            }}
          />
        </>
      ) : (
        <Boton
          titulo="Borrar mi cuenta"
          tipo="texto"
          onPress={() => setBorrando(true)}
        />
      )}
    </ScrollView>
  );
}