import { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import BloqueView from "../../../components/Bloque";
import { Boton, Entrada, Texto } from "../../../components/ui";
import { escucharGrupo, Grupo } from "../../../lib/groups";
import { useTema } from "../../../lib/tema";
import {
  Bloque,
  TipoBloque,
  anadirBloque,
  borrarNota,
  cambiarTitulo,
  escucharBloques,
  escucharNota,
  moverBloque,
} from "../../../lib/notas";

const TIPOS: { tipo: TipoBloque; emoji: string; nombre: string }[] = [
  { tipo: "texto", emoji: "📝", nombre: "Texto" },
  { tipo: "lista", emoji: "☑️", nombre: "Lista" },
  { tipo: "encuesta", emoji: "📊", nombre: "Encuesta" },
  { tipo: "imagen", emoji: "🖼️", nombre: "Imagen" },
  { tipo: "valoracion", emoji: "⭐", nombre: "Valoración" },
  { tipo: "gastos", emoji: "💸", nombre: "Gastos a medias" },
  { tipo: "cuentaatras", emoji: "⏳", nombre: "Cuenta atrás" },
  { tipo: "ubicacion", emoji: "📍", nombre: "Ubicación" },
  { tipo: "dibujo", emoji: "✏️", nombre: "Dibujo" },
  { tipo: "audio", emoji: "🎙️", nombre: "Audio" },
];

export default function PantallaNota() {
  const { grupoId, notaId } = useLocalSearchParams<{
    grupoId: string;
    notaId: string;
  }>();
  const router = useRouter();
  const { c } = useTema();
  const [titulo, setTitulo] = useState("");
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [menu, setMenu] = useState(false);

  // Referencias para poder limpiar al salir de la pantalla
  const listo = useRef({ nota: false, bloques: false });
  const estado = useRef({ titulo: "", n: 0 });
  const tituloGuardado = useRef("");
  const borradaPorMi = useRef(false);
  estado.current = { titulo, n: bloques.length };

  useEffect(() => {
    listo.current = { nota: false, bloques: false };
    const c1 = escucharNota(grupoId, notaId, (n) => {
      listo.current.nota = true;
      if (n) {
        tituloGuardado.current = n.titulo;
        setTitulo(n.titulo);
      }
    });
    const c2 = escucharBloques(grupoId, notaId, (b) => {
      listo.current.bloques = true;
      setBloques(b);
    });
    const c3 = escucharGrupo(grupoId, setGrupo);
    return () => {
      c1();
      c2();
      c3();
    };
  }, [grupoId, notaId]);

  // Al salir: borra la nota si está vacía, o guarda el título si faltaba
  useEffect(() => {
    return () => {
      if (borradaPorMi.current) return;
      if (!listo.current.nota || !listo.current.bloques) return;
      const { titulo: t, n } = estado.current;
      if (!t.trim() && n === 0) {
        borrarNota(grupoId, notaId).catch(() => {});
      } else if (t.trim() && t.trim() !== tituloGuardado.current) {
        cambiarTitulo(grupoId, notaId, t.trim()).catch(() => {});
      }
    };
  }, [grupoId, notaId]);

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso necesario", "Permite el acceso a tus fotos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (res.canceled) return;

    const img = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: 800 } }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    await anadirBloque(grupoId, notaId, "imagen", {
      base64: img.base64,
      ratio: img.width / img.height,
    });
  };

  const anadir = async (tipo: TipoBloque) => {
    setMenu(false);
    try {
      if (tipo === "imagen") await elegirImagen();
      else await anadirBloque(grupoId, notaId, tipo);
    } catch {
      Alert.alert("Error", "No se pudo añadir el bloque. Revisa tu conexión.");
    }
  };

  const eliminarNota = () =>
    Alert.alert("Borrar nota", "Se borrará la nota con todo su contenido.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          borradaPorMi.current = true;
          await borrarNota(grupoId, notaId);
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable onPress={eliminarNota} hitSlop={10}>
              <Texto style={{ fontSize: 20 }}>🗑</Texto>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <Entrada
          value={titulo}
          onChangeText={setTitulo}
          onBlur={() => {
            if (titulo.trim() !== tituloGuardado.current) {
              cambiarTitulo(grupoId, notaId, titulo.trim()).catch(() => {});
            }
          }}
          placeholder="Título de la nota"
          style={{
            fontSize: 28,
            fontWeight: "800",
            marginBottom: 14,
            paddingHorizontal: 0,
          }}
        />

        {bloques.map((b, i) => (
          <BloqueView
            key={b.id}
            grupoId={grupoId}
            notaId={notaId}
            bloque={b}
            miembros={grupo?.miembros ?? []}
            nombres={grupo?.nombres ?? {}}
            alSubir={
              i > 0
                ? () => moverBloque(grupoId, notaId, bloques, i, -1)
                : undefined
            }
            alBajar={
              i < bloques.length - 1
                ? () => moverBloque(grupoId, notaId, bloques, i, 1)
                : undefined
            }
          />
        ))}

        {menu ? (
          <View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t.tipo}
                  onPress={() => anadir(t.tipo)}
                  style={{
                    width: "48%",
                    backgroundColor: c.tarjeta,
                    borderWidth: 1,
                    borderColor: c.borde,
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Texto style={{ fontSize: 26 }}>{t.emoji}</Texto>
                  <Texto style={{ fontSize: 14 }}>{t.nombre}</Texto>
                </Pressable>
              ))}
            </View>
            <Boton
              titulo="Cancelar"
              tipo="texto"
              onPress={() => setMenu(false)}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <Boton titulo="+ Añadir bloque" onPress={() => setMenu(true)} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}