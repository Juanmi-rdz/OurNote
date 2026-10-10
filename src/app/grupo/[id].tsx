import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  asegurarInvitacion,
  escucharGrupo,
  Grupo,
  registrarNombre,
} from "../../lib/groups";
import { crearNota, escucharNotas, Nota } from "../../lib/notas";
import { useTema } from "../../lib/tema";
import { Boton, Campo, Tarjeta, Texto } from "../../components/ui";

const fecha = (n: Nota) =>
  n.creadoEn?.toDate?.().toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  }) ?? "";

export default function PantallaGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTema();
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    registrarNombre(id).catch(() => {});
    const c1 = escucharGrupo(id, (g) => {
      setGrupo(g);
      setCargando(false);
    });
    const c2 = escucharNotas(id, setNotas);
    return () => {
      c1();
      c2();
    };
  }, [id]);

  useEffect(() => {
    if (grupo) asegurarInvitacion(grupo.id, grupo.codigo).catch(() => {});
  }, [grupo?.id, grupo?.codigo]);

  const nuevaNota = async () => {
    try {
      const notaId = await crearNota(id, "");
      router.push(`/nota/${id}/${notaId}`);
    } catch {
      Alert.alert("Error", "No se pudo crear la nota. Revisa tu conexión.");
    }
  };

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={c.primario} />
      </View>
    );
  }

  if (!grupo) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Texto style={{ textAlign: "center", color: c.suave }}>
          Este grupo no existe o no tienes acceso.
        </Texto>
      </View>
    );
  }

  const invitar = () =>
    Share.share({
      message: `Únete a "${grupo.nombre}" en OurNote con este código: ${grupo.codigo}`,
    });

  const q = busqueda.trim().toLowerCase();
  const visibles = q
    ? notas.filter((n) => (n.titulo || "sin título").toLowerCase().includes(q))
    : notas;

  return (
    <FlatList
      data={visibles}
      keyExtractor={(n) => n.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
      ListHeaderComponent={
        <View style={{ marginBottom: 16, gap: 12 }}>
          <Stack.Screen
            options={{
              title: grupo.nombre,
              headerRight: () => (
                <Pressable
                  onPress={() => router.push(`/ajustes-grupo/${id}`)}
                  hitSlop={10}
                >
                  <Texto style={{ fontSize: 20 }}>⚙️</Texto>
                </Pressable>
              ),
            }}
          />
          <Tarjeta style={{ alignItems: "center", gap: 6 }}>
            <Texto style={{ color: c.suave, fontSize: 13, fontWeight: "600" }}>
              CÓDIGO PARA INVITAR
            </Texto>
            <Texto
              style={{
                fontSize: 30,
                fontWeight: "800",
                letterSpacing: 6,
                color: c.primario,
              }}
            >
              {grupo.codigo}
            </Texto>
            <Texto style={{ color: c.suave, fontSize: 14 }}>
              {grupo.miembros.length}{" "}
              {grupo.miembros.length === 1 ? "miembro" : "miembros"}
            </Texto>
            <Boton
              titulo="Compartir código"
              tipo="suave"
              onPress={invitar}
              style={{ alignSelf: "stretch", marginTop: 6 }}
            />
          </Tarjeta>
          <Boton titulo="+ Nueva nota" onPress={nuevaNota} />
          {notas.length > 3 && (
            <Campo
              placeholder="🔍 Buscar nota"
              value={busqueda}
              onChangeText={setBusqueda}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 30 }}>
          <Texto style={{ fontSize: 40 }}>📝</Texto>
          <Texto style={{ color: c.suave, marginTop: 8 }}>
            {q ? "No hay notas con ese nombre." : "Aún no hay notas en este grupo."}
          </Texto>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/nota/${id}/${item.id}`)}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Tarjeta
            style={{
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Texto style={{ fontSize: 17, fontWeight: "600", flex: 1 }}>
              {item.titulo || "Sin título"}
            </Texto>
            <Texto style={{ color: c.suave, fontSize: 13 }}>{fecha(item)}</Texto>
          </Tarjeta>
        </Pressable>
      )}
    />
  );
}