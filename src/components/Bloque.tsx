import { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Image,
  Alert,
  Linking,
  Modal,
  PanResponder,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import * as Location from "expo-location";
import { auth } from "../lib/firebase";
import { Bloque, actualizarBloque, borrarBloque } from "../lib/notas";
import { Colores, useTema } from "../lib/tema";
import { Boton, Entrada, Tarjeta, Texto } from "./ui";
import { deleteField } from "firebase/firestore";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { File, Paths } from "expo-file-system";

type Props = {
  grupoId: string;
  notaId: string;
  bloque: Bloque;
  miembros: string[];
  nombres: Record<string, string>;
  alSubir?: () => void;
  alBajar?: () => void;
};

type Sub = {
  bloque: Bloque;
  guardar: (c: Record<string, any>) => Promise<void>;
};

const tituloEstilo = {
  fontWeight: "700",
  fontSize: 17,
  paddingRight: 28,
} as const;

export default function BloqueView({
  grupoId,
  notaId,
  bloque,
  miembros,
  nombres,
  alSubir,
  alBajar,
}: Props) {
  const { c } = useTema();
  const guardar = (cambios: Record<string, any>) =>
    actualizarBloque(grupoId, notaId, bloque.id, cambios);

  const pedirBorrado = () =>
    Alert.alert("Borrar bloque", "¿Seguro que quieres borrarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: () => borrarBloque(grupoId, notaId, bloque.id),
      },
    ]);

  return (
    <Tarjeta style={{ marginBottom: 14 }}>
      <View
        style={{
          position: "absolute",
          right: 12,
          top: 10,
          zIndex: 1,
          flexDirection: "row",
          gap: 14,
        }}
      >
        {alSubir && (
          <Pressable onPress={alSubir} hitSlop={8}>
            <Texto style={{ color: c.suave, fontSize: 16 }}>▲</Texto>
          </Pressable>
        )}
        {alBajar && (
          <Pressable onPress={alBajar} hitSlop={8}>
            <Texto style={{ color: c.suave, fontSize: 16 }}>▼</Texto>
          </Pressable>
        )}
        <Pressable onPress={pedirBorrado} hitSlop={8}>
          <Texto style={{ color: c.suave, fontSize: 16 }}>✕</Texto>
        </Pressable>
              {bloque.tipo === "audio" && (
        <AudioBloque bloque={bloque} guardar={guardar} nombres={nombres} />
      )}
      </View>

      {bloque.tipo === "texto" && <TextoBloque bloque={bloque} guardar={guardar} />}
      {bloque.tipo === "lista" && <Lista bloque={bloque} guardar={guardar} />}
      {bloque.tipo === "encuesta" && <Encuesta bloque={bloque} guardar={guardar} />}
      {bloque.tipo === "imagen" && <Imagen bloque={bloque} />}
      {bloque.tipo === "valoracion" && (
        <Valoracion bloque={bloque} guardar={guardar} />
      )}
      {bloque.tipo === "gastos" && (
        <Gastos
          bloque={bloque}
          guardar={guardar}
          miembros={miembros}
          nombres={nombres}
        />
      )}
      {bloque.tipo === "cuentaatras" && (
        <CuentaAtras bloque={bloque} guardar={guardar} />
      )}
      {bloque.tipo === "ubicacion" && (
        <Ubicacion bloque={bloque} guardar={guardar} />
      )}
      {bloque.tipo === "dibujo" && <Dibujo bloque={bloque} guardar={guardar} />}
    </Tarjeta>
  );
}

// Campo que guarda al salir y se sincroniza si el otro lo cambia
function CampoTexto({
  valor,
  alGuardar,
  placeholder,
  multilinea,
  estilo,
}: {
  valor: string;
  alGuardar: (t: string) => void;
  placeholder?: string;
  multilinea?: boolean;
  estilo?: object;
}) {
  const [texto, setTexto] = useState(valor);
  const [enfocado, setEnfocado] = useState(false);

  useEffect(() => {
    if (!enfocado) setTexto(valor);
  }, [valor, enfocado]);

  return (
    <Entrada
      value={texto}
      onChangeText={setTexto}
      onFocus={() => setEnfocado(true)}
      onBlur={() => {
        setEnfocado(false);
        if (texto !== valor) alGuardar(texto);
      }}
      placeholder={placeholder}
      multiline={multilinea}
      style={estilo}
    />
  );
}

// Campo pequeño con fondo para añadir elementos
function CampoAnadir(props: React.ComponentProps<typeof Entrada>) {
  const { c } = useTema();
  return (
    <Entrada
      returnKeyType="done"
      blurOnSubmit={false}
      {...props}
      style={[
        {
          backgroundColor: c.campo,
          borderRadius: 10,
          marginTop: 8,
          paddingHorizontal: 12,
        },
        props.style,
      ]}
    />
  );
}

// ---------- Texto ----------
function TextoBloque({ bloque, guardar }: Sub) {
  return (
    <CampoTexto
      valor={bloque.texto}
      alGuardar={(t) => guardar({ texto: t })}
      placeholder="Escribe algo..."
      multilinea
      estilo={{ minHeight: 44, paddingRight: 28 }}
    />
  );
}

// ---------- Lista ----------
function Lista({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const [nuevo, setNuevo] = useState("");
  const items: { id: string; texto: string; hecho: boolean }[] =
    bloque.items ?? [];

  const anadir = () => {
    const t = nuevo.trim();
    if (!t) return;
    guardar({
      items: [...items, { id: String(Date.now()), texto: t, hecho: false }],
    });
    setNuevo("");
  };

  return (
    <View>
      <CampoTexto
        valor={bloque.titulo}
        alGuardar={(t) => guardar({ titulo: t })}
        placeholder="Título de la lista"
        estilo={tituloEstilo}
      />
      {items.map((it) => (
        <View
          key={it.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          <Pressable
            onPress={() =>
              guardar({
                items: items.map((x) =>
                  x.id === it.id ? { ...x, hecho: !x.hecho } : x
                ),
              })
            }
            style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: it.hecho ? c.primario : c.suave,
                backgroundColor: it.hecho ? c.primario : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {it.hecho && (
                <Texto
                  style={{ color: c.sobrePrimario, fontSize: 14, fontWeight: "700" }}
                >
                  ✓
                </Texto>
              )}
            </View>
            <Texto
              style={{
                flex: 1,
                textDecorationLine: it.hecho ? "line-through" : "none",
                color: it.hecho ? c.suave : c.texto,
              }}
            >
              {it.texto}
            </Texto>
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => guardar({ items: items.filter((x) => x.id !== it.id) })}
          >
            <Texto style={{ color: c.suave }}>🗑</Texto>
          </Pressable>
        </View>
      ))}
      <CampoAnadir
        value={nuevo}
        onChangeText={setNuevo}
        onSubmitEditing={anadir}
        placeholder="+ Añadir elemento"
      />
    </View>
  );
}

// ---------- Encuesta ----------
function Encuesta({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const [nueva, setNueva] = useState("");
  const uid = auth.currentUser!.uid;
  const opciones: { id: string; texto: string }[] = bloque.opciones ?? [];
  const todosVotos: Record<string, string> = bloque.votos ?? {};

  // Solo cuentan los votos de opciones que siguen existiendo
  const ids = new Set(opciones.map((o) => o.id));
  const votos = Object.fromEntries(
    Object.entries(todosVotos).filter(([, v]) => ids.has(v))
  );
  const total = Object.keys(votos).length;
  const miVoto = votos[uid];

  const contar = (id: string) =>
    Object.values(votos).filter((v) => v === id).length;

  const cambiarTexto = (id: string, texto: string) =>
    guardar({
      opciones: opciones.map((o) => (o.id === id ? { ...o, texto } : o)),
    });

  const votar = (id: string) =>
    // Volver a pulsar tu voto lo quita
    guardar({ [`votos.${uid}`]: miVoto === id ? deleteField() : id });

  const borrar = (id: string) => {
    const cambios: Record<string, any> = {
      opciones: opciones.filter((o) => o.id !== id),
    };
    for (const [u, v] of Object.entries(todosVotos)) {
      if (v === id) cambios[`votos.${u}`] = deleteField();
    }
    guardar(cambios);
  };

  const anadir = () => {
    const t = nueva.trim();
    if (!t) return;
    guardar({ opciones: [...opciones, { id: String(Date.now()), texto: t }] });
    setNueva("");
  };

  return (
    <View>
      <CampoTexto
        valor={bloque.pregunta}
        alGuardar={(t) => guardar({ pregunta: t })}
        placeholder="Pregunta de la encuesta"
        estilo={tituloEstilo}
      />
      <Texto style={{ color: c.suave, fontSize: 12, paddingHorizontal: 8 }}>
        Toca el círculo para votar y el texto para editarlo
      </Texto>

      {opciones.map((o, i) => {
        const n = contar(o.id);
        const pct = total ? (n / total) * 100 : 0;
        const elegido = miVoto === o.id;
        return (
          <View
            key={o.id}
            style={{
              borderWidth: 1.5,
              borderColor: elegido ? c.primario : c.borde,
              borderRadius: 10,
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                backgroundColor: c.primarioSuave,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 8,
              }}
            >
              <Pressable
                onPress={() => votar(o.id)}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: elegido ? c.primario : c.suave,
                    backgroundColor: elegido ? c.primario : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {elegido && (
                    <Texto
                      style={{
                        color: c.sobrePrimario,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      ✓
                    </Texto>
                  )}
                </View>
              </Pressable>
              <CampoTexto
                valor={o.texto}
                alGuardar={(t) => cambiarTexto(o.id, t)}
                placeholder={`Opción ${i + 1}`}
                estilo={{ flex: 1 }}
              />
              <Texto style={{ color: c.suave, marginLeft: 6 }}>{n}</Texto>
              {opciones.length > 2 && (
                <Pressable
                  onPress={() => borrar(o.id)}
                  hitSlop={10}
                  style={{ paddingLeft: 10, paddingRight: 4 }}
                >
                  <Texto style={{ color: c.suave }}>🗑</Texto>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      <CampoAnadir
        value={nueva}
        onChangeText={setNueva}
        onSubmitEditing={anadir}
        placeholder="+ Añadir opción"
      />
    </View>
  );
}

// ---------- Imagen ----------
function Imagen({ bloque }: { bloque: Bloque }) {
  return (
    <Image
      source={{ uri: `data:image/jpeg;base64,${bloque.base64}` }}
      style={{
        width: "100%",
        aspectRatio: bloque.ratio ?? 1,
        borderRadius: 10,
        marginTop: 22,
      }}
      resizeMode="cover"
    />
  );
}

// ---------- Valoración ----------
function Valoracion({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const uid = auth.currentUser!.uid;
  const punt: Record<string, number> = bloque.puntuaciones ?? {};
  const mia = punt[uid] ?? 0;
  const otras = Object.entries(punt)
    .filter(([k]) => k !== uid)
    .map(([, v]) => v);
  const media = otras.length
    ? (otras.reduce((a, b) => a + b, 0) / otras.length).toFixed(1)
    : null;

  return (
    <View>
      <CampoTexto
        valor={bloque.titulo}
        alGuardar={(t) => guardar({ titulo: t })}
        placeholder="¿Qué quieres valorar?"
        estilo={tituloEstilo}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 6,
          paddingHorizontal: 8,
        }}
      >
        <Texto style={{ width: 60, color: c.suave }}>Tú</Texto>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => guardar({ [`puntuaciones.${uid}`]: n })}
          >
            <Texto
              style={{
                fontSize: 30,
                color: n <= mia ? c.estrella : c.suave,
                opacity: n <= mia ? 1 : 0.4,
              }}
            >
              ★
            </Texto>
          </Pressable>
        ))}
      </View>
      <Texto style={{ marginTop: 4, color: c.suave, fontSize: 14, paddingHorizontal: 8 }}>
        {media
          ? `Otros: ${media} ★ (${otras.length})`
          : "Los demás aún no han votado"}
      </Texto>
    </View>
  );
}

// ---------- Gastos a medias ----------
const fmt = (n: number) => n.toFixed(2).replace(".", ",");

function Gastos({
  bloque,
  guardar,
  miembros,
  nombres,
}: Sub & { miembros: string[]; nombres: Record<string, string> }) {
  const { c } = useTema();
  const uid = auth.currentUser!.uid;
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");
  const items: {
    id: string;
    concepto: string;
    importe: number;
    pagadoPor: string;
  }[] = bloque.items ?? [];

  const nombre = (id: string) =>
    id === uid ? "Tú" : nombres[id] ?? "Otro miembro";

  const total = items.reduce((a, i) => a + i.importe, 0);
  const parte = total / (miembros.length || 1);
  const saldos = miembros.map((id) => ({
    id,
    saldo:
      items.filter((i) => i.pagadoPor === id).reduce((a, i) => a + i.importe, 0) -
      parte,
  }));

  let resumen = "";
  if (total === 0) {
    resumen = "Sin gastos todavía";
  } else if (miembros.length === 2) {
    const deudor = saldos.find((s) => s.saldo < -0.005);
    const acreedor = saldos.find((s) => s.saldo > 0.005);
    if (!deudor || !acreedor) resumen = "Estáis en paz 🤝";
    else {
      const x = fmt(acreedor.saldo);
      if (deudor.id === uid) resumen = `Debes ${x} € a ${nombre(acreedor.id)}`;
      else if (acreedor.id === uid)
        resumen = `${nombre(deudor.id)} te debe ${x} €`;
      else resumen = `${nombre(deudor.id)} debe ${x} € a ${nombre(acreedor.id)}`;
    }
  }

  const anadir = () => {
    const valor = Math.round(parseFloat(importe.replace(",", ".")) * 100) / 100;
    if (!concepto.trim() || !isFinite(valor) || valor <= 0) return;
    guardar({
      items: [
        ...items,
        {
          id: String(Date.now()),
          concepto: concepto.trim(),
          importe: valor,
          pagadoPor: uid,
        },
      ],
    });
    setConcepto("");
    setImporte("");
  };

  const saldar = () =>
    Alert.alert("Saldar cuentas", "Se borrarán todos los gastos de este bloque.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Saldar", style: "destructive", onPress: () => guardar({ items: [] }) },
    ]);

  const campoMini = {
    backgroundColor: c.campo,
    borderRadius: 10,
    paddingHorizontal: 12,
  };

  return (
    <View>
      <CampoTexto
        valor={bloque.titulo}
        alGuardar={(t) => guardar({ titulo: t })}
        placeholder="Gastos (ej: viaje a Roma)"
        estilo={tituloEstilo}
      />
      {items.map((i) => (
        <View
          key={i.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Texto>{i.concepto}</Texto>
            <Texto style={{ color: c.suave, fontSize: 12 }}>
              Pagó {nombre(i.pagadoPor)}
            </Texto>
          </View>
          <Texto style={{ marginRight: 10 }}>{fmt(i.importe)} €</Texto>
          <Pressable
            hitSlop={10}
            onPress={() => guardar({ items: items.filter((x) => x.id !== i.id) })}
          >
            <Texto style={{ color: c.suave }}>🗑</Texto>
          </Pressable>
        </View>
      ))}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Entrada
          value={concepto}
          onChangeText={setConcepto}
          placeholder="Concepto"
          style={[campoMini, { flex: 2 }]}
        />
        <Entrada
          value={importe}
          onChangeText={setImporte}
          placeholder="€"
          keyboardType="decimal-pad"
          style={[campoMini, { flex: 1 }]}
        />
        <Pressable
          onPress={anadir}
          style={{
            justifyContent: "center",
            backgroundColor: c.primario,
            borderRadius: 10,
            paddingHorizontal: 14,
          }}
        >
          <Texto style={{ fontSize: 22, color: c.sobrePrimario }}>＋</Texto>
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: c.primarioSuave,
          borderRadius: 12,
          padding: 12,
          marginTop: 12,
        }}
      >
        <Texto style={{ fontWeight: "700" }}>Total: {fmt(total)} €</Texto>
        {miembros.length === 2 ? (
          <Texto style={{ marginTop: 2 }}>{resumen}</Texto>
        ) : (
          saldos.map((s) => (
            <Texto key={s.id} style={{ marginTop: 2 }}>
              {nombre(s.id)}: {s.saldo >= 0 ? "+" : "−"}
              {fmt(Math.abs(s.saldo))} €
            </Texto>
          ))
        )}
        <Texto style={{ color: c.suave, fontSize: 12, marginTop: 4 }}>
          Los gastos se dividen a partes iguales entre todos los miembros.
        </Texto>
      </View>
      {items.length > 0 && (
        <Boton
          titulo="Saldar cuentas"
          tipo="texto"
          onPress={saldar}
          style={{ marginTop: 4 }}
        />
      )}
    </View>
  );
}

// ---------- Cuenta atrás ----------
function parsearFecha(t: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function CuentaAtras({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const fecha = parsearFecha(bloque.fecha ?? "");
  let dias: number | null = null;
  if (fecha) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  }

  return (
    <View>
      <CampoTexto
        valor={bloque.titulo}
        alGuardar={(t) => guardar({ titulo: t })}
        placeholder="¿Qué estáis esperando? (ej: Aniversario)"
        estilo={tituloEstilo}
      />
      <CampoTexto
        valor={bloque.fecha}
        alGuardar={(t) => guardar({ fecha: t })}
        placeholder="Fecha: DD/MM/AAAA"
      />
      {dias !== null ? (
        <View style={{ alignItems: "center", paddingVertical: 10 }}>
          <Texto style={{ fontSize: 52, fontWeight: "800", color: c.primario }}>
            {dias === 0 ? "🎉" : Math.abs(dias)}
          </Texto>
          <Texto style={{ color: c.suave }}>
            {dias === 0
              ? "¡Es hoy!"
              : dias > 0
              ? dias === 1
                ? "día restante"
                : "días restantes"
              : Math.abs(dias) === 1
              ? "día desde entonces"
              : "días desde entonces"}
          </Texto>
        </View>
      ) : (
        !!bloque.fecha && (
          <Texto style={{ color: c.peligro, padding: 6 }}>Fecha no válida</Texto>
        )
      )}
    </View>
  );
}

// ---------- Ubicación ----------
function Ubicacion({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const tieneCoords = bloque.lat != null && bloque.lng != null;

  const usarMiUbicacion = async () => {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso necesario", "Permite el acceso a tu ubicación.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    guardar({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  };

  const abrirMapas = () => {
    const q = tieneCoords
      ? `${bloque.lat},${bloque.lng}`
      : encodeURIComponent(bloque.nombre ?? "");
    if (!q) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  return (
    <View>
      <CampoTexto
        valor={bloque.nombre}
        alGuardar={(t) => guardar({ nombre: t })}
        placeholder="📍 Nombre del sitio o dirección"
        estilo={tituloEstilo}
      />
      {tieneCoords && (
        <Texto style={{ color: c.suave, fontSize: 13, paddingHorizontal: 8 }}>
          Coordenadas guardadas ({bloque.lat.toFixed(4)}, {bloque.lng.toFixed(4)})
        </Texto>
      )}
      <View style={{ flexDirection: "row", gap: 16, padding: 8, flexWrap: "wrap" }}>
        <Pressable onPress={abrirMapas}>
          <Texto style={{ color: c.primario, fontWeight: "600" }}>
            🗺 Abrir en mapas
          </Texto>
        </Pressable>
        <Pressable onPress={usarMiUbicacion}>
          <Texto style={{ color: c.primario, fontWeight: "600" }}>
            {tieneCoords ? "Actualizar" : "Usar mi ubicación"}
          </Texto>
        </Pressable>
        {tieneCoords && (
          <Pressable onPress={() => guardar({ lat: null, lng: null })}>
            <Texto style={{ color: c.suave }}>Quitar</Texto>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------- Dibujo ----------
type Trazo = { d: string; c: string };
const COLORES = ["#000000", "#e63946", "#2f80ed", "#2a9d8f", "#f5a623"];
const LADO = 300;

const marco = (c: Colores) =>
  ({
    width: "100%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: c.borde,
    borderRadius: 12,
    overflow: "hidden",
  } as const);

function VistaDibujo({ trazos, extra }: { trazos: Trazo[]; extra?: Trazo | null }) {
  const todos = extra ? [...trazos, extra] : trazos;
  return (
    <Svg viewBox={`0 0 ${LADO} ${LADO}`} width="100%" height="100%">
      <Rect x={0} y={0} width={LADO} height={LADO} fill="white" />
      {todos.map((t, i) => (
        <Path
          key={i}
          d={t.d}
          stroke={t.c}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

function Dibujo({ bloque, guardar }: Sub) {
  const { c } = useTema();
  const [abierto, setAbierto] = useState(false);
  const trazos: Trazo[] = bloque.trazos ?? [];

  return (
    <View style={{ marginTop: 22 }}>
      <Pressable onPress={() => setAbierto(true)}>
        <View style={marco(c)} pointerEvents="none">
          <VistaDibujo trazos={trazos} />
        </View>
        <Texto
          style={{
            color: c.primario,
            fontWeight: "600",
            textAlign: "center",
            padding: 8,
          }}
        >
          ✏️ {trazos.length ? "Editar dibujo" : "Dibujar"}
        </Texto>
      </Pressable>
      <Modal
        visible={abierto}
        animationType="slide"
        onRequestClose={() => setAbierto(false)}
      >
        <Editor
          inicial={trazos}
          alCerrar={() => setAbierto(false)}
          alGuardar={(t) => {
            guardar({ trazos: t });
            setAbierto(false);
          }}
        />
      </Modal>
    </View>
  );
}

function Editor({
  inicial,
  alGuardar,
  alCerrar,
}: {
  inicial: Trazo[];
  alGuardar: (t: Trazo[]) => void;
  alCerrar: () => void;
}) {
  const { c } = useTema();
  const [trazos, setTrazos] = useState<Trazo[]>(inicial);
  const [actual, setActual] = useState<Trazo | null>(null);
  const [color, setColor] = useState(COLORES[0]);
  const colorRef = useRef(color);
  colorRef.current = color;
  const lado = useRef(1);
  const trazoRef = useRef<Trazo | null>(null);

  const punto = (e: any) => {
    const k = LADO / lado.current;
    return [
      Math.round(e.nativeEvent.locationX * k),
      Math.round(e.nativeEvent.locationY * k),
    ];
  };

  const fin = () => {
    const t = trazoRef.current;
    if (t) setTrazos((p) => [...p, t]);
    trazoRef.current = null;
    setActual(null);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const [x, y] = punto(e);
        trazoRef.current = { d: `M${x} ${y} L${x} ${y}`, c: colorRef.current };
        setActual(trazoRef.current);
      },
      onPanResponderMove: (e) => {
        if (!trazoRef.current) return;
        const [x, y] = punto(e);
        trazoRef.current = {
          ...trazoRef.current,
          d: `${trazoRef.current.d} L${x} ${y}`,
        };
        setActual(trazoRef.current);
      },
      onPanResponderRelease: fin,
      onPanResponderTerminate: fin,
    })
  ).current;

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        paddingTop: 60,
        gap: 16,
        backgroundColor: c.fondo,
      }}
    >
      <View
        style={marco(c)}
        onLayout={(e) => (lado.current = e.nativeEvent.layout.width)}
        {...pan.panHandlers}
      >
        <View style={{ flex: 1 }} pointerEvents="none">
          <VistaDibujo trazos={trazos} extra={actual} />
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
        {COLORES.map((col) => (
          <Pressable
            key={col}
            onPress={() => setColor(col)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: col,
              borderWidth: color === col ? 4 : 1,
              borderColor: color === col ? c.primario : c.borde,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <Pressable onPress={() => setTrazos((p) => p.slice(0, -1))}>
          <Texto>↩️ Deshacer</Texto>
        </Pressable>
        <Pressable onPress={() => setTrazos([])}>
          <Texto>🧹 Borrar todo</Texto>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
        <Boton titulo="Cancelar" tipo="suave" onPress={alCerrar} style={{ flex: 1 }} />
        <Boton
          titulo="Guardar"
          onPress={() => alGuardar(trazos)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
// ---------- Audio ----------
const MAX_SEG = 90;

// Voz: mono y ligero, para que quepa en un documento de Firestore
const PRESET_VOZ: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
};

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

async function leerBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

// Guarda el audio en la caché del móvil para poder reproducirlo
function archivoDeAudio(id: string, version: number, b64: string): string {
  const f = new File(Paths.cache, `audio_${id}_${version}.m4a`);
  if (!f.exists) {
    try {
      f.create();
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      f.write(bytes);
    } catch (e) {
      try {
        f.delete();
      } catch {}
      throw e;
    }
  }
  return f.uri;
}

function AudioBloque({
  bloque,
  guardar,
  nombres,
}: Sub & { nombres: Record<string, string> }) {
  return (
    <View>
      <CampoTexto
        valor={bloque.titulo}
        alGuardar={(t) => guardar({ titulo: t })}
        placeholder="🎙 Nota de voz"
        estilo={tituloEstilo}
      />
      {bloque.base64 ? (
        <Reproductor bloque={bloque} guardar={guardar} nombres={nombres} />
      ) : (
        <Grabador guardar={guardar} />
      )}
    </View>
  );
}

function Grabador({ guardar }: { guardar: Sub["guardar"] }) {
  const { c } = useTema();
  const recorder = useAudioRecorder(PRESET_VOZ);
  const estado = useAudioRecorderState(recorder);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const ocupado = useRef(false);

  const empezar = async () => {
    try {
      setError("");
      const permiso = await AudioModule.requestRecordingPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          "Permiso necesario",
          "Permite el acceso al micrófono para grabar audios."
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError("No se pudo empezar a grabar.");
    }
  };

  const parar = async (conservar: boolean) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const segundos = Math.round(estado.durationMillis / 1000);

    const fallar = (msg: string) => {
      setError(msg);
      setGuardando(false);
      ocupado.current = false;
    };

    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!conservar) {
        ocupado.current = false;
        return;
      }
      setGuardando(true);
      const uri = recorder.uri;
      if (!uri) return fallar("No se pudo guardar la grabación.");
      const base64 = await leerBase64(uri);
      if (base64.length > 850_000) return fallar("El audio es demasiado largo.");
      await guardar({
        base64,
        duracion: segundos,
        version: Date.now(),
        autor: auth.currentUser!.uid,
      });
      // Al guardarse, el bloque pasa solo a mostrar el reproductor
    } catch {
      fallar("No se pudo guardar el audio. Inténtalo de nuevo.");
    }
  };

  // Corta solo al llegar al máximo
  useEffect(() => {
    if (estado.isRecording && estado.durationMillis >= MAX_SEG * 1000) {
      parar(true);
    }
  }, [estado.isRecording, estado.durationMillis]);

  if (guardando) {
    return (
      <Texto style={{ color: c.suave, padding: 10, textAlign: "center" }}>
        Guardando audio...
      </Texto>
    );
  }

  return (
    <View style={{ paddingTop: 8 }}>
      {estado.isRecording ? (
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingVertical: 8,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: c.peligro,
              }}
            />
            <Texto style={{ fontSize: 28, fontWeight: "700" }}>
              {mmss(estado.durationMillis / 1000)}
            </Texto>
            <Texto style={{ color: c.suave }}>/ {mmss(MAX_SEG)}</Texto>
          </View>
          <Boton titulo="⏹ Parar y guardar" onPress={() => parar(true)} />
          <Boton titulo="Descartar" tipo="texto" onPress={() => parar(false)} />
        </View>
      ) : (
        <Boton titulo="🎙 Grabar audio" tipo="suave" onPress={empezar} />
      )}
      {error ? (
        <Texto style={{ color: c.peligro, textAlign: "center", marginTop: 8 }}>
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

function Reproductor({
  bloque,
  guardar,
  nombres,
}: Sub & { nombres: Record<string, string> }) {
  const { c } = useTema();
  const uid = auth.currentUser!.uid;
  const [uri, setUri] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    try {
      setUri(archivoDeAudio(bloque.id, bloque.version ?? 0, bloque.base64));
      setFallo(false);
    } catch {
      setFallo(true);
    }
  }, [bloque.id, bloque.version]);

  const player = useAudioPlayer(uri);
  const estado = useAudioPlayerStatus(player);

  const total = estado.duration > 0 ? estado.duration : bloque.duracion ?? 0;
  const pct = total ? Math.min(100, (estado.currentTime / total) * 100) : 0;
  const quien =
    bloque.autor === uid ? "Tú" : nombres[bloque.autor] ?? "Otro miembro";

  const alternar = async () => {
    if (!uri) return;
    if (estado.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    if (total && estado.currentTime >= total - 0.15) await player.seekTo(0);
    player.play();
  };

  const regrabar = () =>
    Alert.alert("Grabar de nuevo", "Se reemplazará el audio actual.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Reemplazar",
        style: "destructive",
        onPress: () => guardar({ base64: null, duracion: 0, version: 0 }),
      },
    ]);

  if (fallo) {
    return (
      <Texto style={{ color: c.peligro, padding: 8 }}>
        No se pudo cargar el audio.
      </Texto>
    );
  }

  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={alternar}
          disabled={!uri}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: c.primario,
            alignItems: "center",
            justifyContent: "center",
            opacity: uri ? 1 : 0.5,
          }}
        >
          <Texto style={{ color: c.sobrePrimario, fontSize: 20 }}>
            {estado.playing ? "⏸" : "▶"}
          </Texto>
        </Pressable>

        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: c.campo,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: c.primario,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 6,
            }}
          >
            <Texto style={{ color: c.suave, fontSize: 13 }}>
              {mmss(estado.currentTime)} / {mmss(total)}
            </Texto>
            <Texto style={{ color: c.suave, fontSize: 13 }}>🎙 {quien}</Texto>
          </View>
        </View>
      </View>

      <Pressable onPress={regrabar} hitSlop={8} style={{ marginTop: 8 }}>
        <Texto style={{ color: c.suave, fontSize: 13, textAlign: "center" }}>
          Grabar de nuevo
        </Texto>
      </Pressable>
    </View>
  );
}