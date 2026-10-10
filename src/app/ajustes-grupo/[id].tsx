import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { auth } from "../../lib/firebase";
import {
  cambiarNombreGrupo,
  escucharGrupo,
  Grupo,
  salirDelGrupo,
} from "../../lib/groups";
import { useTema } from "../../lib/tema";
import { Boton, Campo, Tarjeta, Texto } from "../../components/ui";

export default function AjustesGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTema();
  const uid = auth.currentUser!.uid;
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    return escucharGrupo(id, (g) => {
      setGrupo(g);
      if (g) setNombre((prev) => prev || g.nombre);
    });
  }, [id]);

  if (!grupo) return null;

  const guardar = async () => {
    if (!nombre.trim()) return;
    await cambiarNombreGrupo(id, nombre.trim());
    setAviso("Guardado ✓");
  };

  const salir = () => {
    const ultimo = grupo.miembros.length <= 1;
    Alert.alert(
      ultimo ? "Borrar grupo" : "Salir del grupo",
      ultimo
        ? "Eres el único miembro: se borrará el grupo con todas sus notas."
        : "Dejarás de ver este grupo. Podrás volver a entrar con el código.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: ultimo ? "Borrar" : "Salir",
          style: "destructive",
          onPress: async () => {
            try {
              await salirDelGrupo(id);
              router.dismissAll();
            } catch {
              Alert.alert("Error", "No se pudo completar. Inténtalo de nuevo.");
            }
          },
        },
      ]
    );
  };

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
      <Stack.Screen options={{ title: "Ajustes del grupo" }} />

      <Texto style={{ ...titulo, marginTop: 0 }}>NOMBRE DEL GRUPO</Texto>
      <Campo value={nombre} onChangeText={setNombre} />
      <Boton
        titulo="Guardar nombre"
        tipo="suave"
        onPress={guardar}
        style={{ marginTop: 10 }}
      />
      {aviso ? (
        <Texto style={{ color: c.suave, textAlign: "center", marginTop: 8 }}>
          {aviso}
        </Texto>
      ) : null}

      <Texto style={titulo}>MIEMBROS ({grupo.miembros.length})</Texto>
      <Tarjeta style={{ gap: 10 }}>
        {grupo.miembros.map((m) => (
          <View key={m} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Texto style={{ fontSize: 20 }}>👤</Texto>
            <Texto>
              {grupo.nombres?.[m] ?? "Miembro (aún no ha abierto el grupo)"}
              {m === uid ? " (tú)" : ""}
            </Texto>
          </View>
        ))}
      </Tarjeta>

      <Texto style={titulo}>CÓDIGO DE INVITACIÓN</Texto>
      <Texto
        style={{
          fontSize: 26,
          fontWeight: "800",
          letterSpacing: 5,
          color: c.primario,
        }}
      >
        {grupo.codigo}
      </Texto>

      <Boton
        titulo={grupo.miembros.length <= 1 ? "Borrar grupo" : "Salir del grupo"}
        tipo="peligro"
        onPress={salir}
        style={{ marginTop: 34 }}
      />
    </ScrollView>
  );
}