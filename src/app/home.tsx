import { useEffect, useState } from "react";
import { View, ActivityIndicator, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { crearGrupo, unirseAGrupo, escucharMisGrupos, Grupo } from "../lib/groups";
import { useTema } from "../lib/tema";
import { Boton, Campo, Tarjeta, Texto } from "../components/ui";

export default function Home() {
  const router = useRouter();
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<"crear" | "unirse" | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const cancelar = escucharMisGrupos(
      (g) => {
        setGrupos(g);
        setCargando(false);
      },
      (e) => {
        setError(e.message);
        setCargando(false);
      }
    );
    return cancelar;
  }, []);

  const confirmar = async () => {
    try {
      setError("");
      if (modo === "crear") await crearGrupo(texto.trim() || "Nuestro grupo");
      else if (modo === "unirse") await unirseAGrupo(texto);
      setTexto("");
      setModo(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (cargando) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: c.fondo,
        }}
      >
        <ActivityIndicator color={c.primario} />
      </View>
    );
  }

  return (
    <FlatList
      data={grupos}
      keyExtractor={(g) => g.id}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={{
        padding: 20,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 40,
      }}
      ListHeaderComponent={
        <View
          style={{
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Texto style={{ fontSize: 32, fontWeight: "800" }}>Mis grupos</Texto>
            <Texto style={{ color: c.suave, marginTop: 2 }}>
              {auth.currentUser?.displayName || auth.currentUser?.email}
            </Texto>
          </View>
          <Pressable onPress={() => router.push("/ajustes")} hitSlop={10}>
            <Texto style={{ fontSize: 28 }}>⚙️</Texto>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 30 }}>
          <Texto style={{ fontSize: 40 }}>📓</Texto>
          <Texto style={{ color: c.suave, textAlign: "center", marginTop: 8 }}>
            Aún no tienes ningún grupo.{"\n"}Crea uno o únete con un código.
          </Texto>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/grupo/${item.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Tarjeta
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: c.primarioSuave,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Texto
                style={{ color: c.primario, fontSize: 20, fontWeight: "700" }}
              >
                {item.nombre.charAt(0).toUpperCase()}
              </Texto>
            </View>
            <View style={{ flex: 1 }}>
              <Texto style={{ fontSize: 17, fontWeight: "600" }}>
                {item.nombre}
              </Texto>
              <Texto style={{ color: c.suave, fontSize: 14 }}>
                {item.miembros.length}{" "}
                {item.miembros.length === 1 ? "miembro" : "miembros"}
              </Texto>
            </View>
            <Texto style={{ color: c.suave, fontSize: 22 }}>›</Texto>
          </Tarjeta>
        </Pressable>
      )}
      ListFooterComponent={
        <View style={{ marginTop: 10, gap: 10 }}>
          {modo ? (
            <>
              <Campo
                placeholder={
                  modo === "crear" ? "Nombre del grupo" : "Código (6 caracteres)"
                }
                value={texto}
                onChangeText={setTexto}
                autoCapitalize={modo === "unirse" ? "characters" : "sentences"}
              />
              <Boton
                titulo={modo === "crear" ? "Crear" : "Unirme"}
                onPress={confirmar}
              />
              <Boton
                titulo="Cancelar"
                tipo="texto"
                onPress={() => {
                  setModo(null);
                  setTexto("");
                  setError("");
                }}
              />
            </>
          ) : (
            <>
              <Boton titulo="+ Crear grupo nuevo" onPress={() => setModo("crear")} />
              <Boton
                titulo="Unirme con un código"
                tipo="suave"
                onPress={() => setModo("unirse")}
              />
            </>
          )}

          {error ? (
            <Texto style={{ color: c.peligro, textAlign: "center" }}>
              {error}
            </Texto>
          ) : null}
        </View>
      }
    />
  );
}