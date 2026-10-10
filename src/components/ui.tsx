import { ReactNode, useState } from "react";
import {
  Pressable,
  StyleProp,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from "react-native";
import {
  ACENTO_POR_DEFECTO,
  PALETA,
  normalizarHex,
  textoSobre,
  useTema,
} from "../lib/tema";

export function Texto(props: TextProps) {
  const { c } = useTema();
  return (
    <RNText {...props} style={[{ color: c.texto, fontSize: 16 }, props.style]} />
  );
}

export function Entrada(props: TextInputProps) {
  const { c, esOscuro } = useTema();
  return (
    <RNTextInput
      placeholderTextColor={c.suave}
      keyboardAppearance={esOscuro ? "dark" : "light"}
      selectionColor={c.primario}
      {...props}
      style={[{ color: c.texto, fontSize: 16, padding: 8 }, props.style]}
    />
  );
}

// Campo con fondo, para formularios
export function Campo(props: TextInputProps) {
  const { c } = useTema();
  return (
    <Entrada
      {...props}
      style={[
        { backgroundColor: c.campo, borderRadius: 12, padding: 14 },
        props.style,
      ]}
    />
  );
}

export function Boton({
  titulo,
  onPress,
  tipo = "primario",
  style,
}: {
  titulo: string;
  onPress: () => void;
  tipo?: "primario" | "suave" | "texto" | "peligro";
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTema();
  const fondo =
    tipo === "primario"
      ? c.primario
      : tipo === "peligro"
      ? c.peligro
      : tipo === "suave"
      ? c.primarioSuave
      : "transparent";
  const color =
    tipo === "primario"
      ? c.sobrePrimario
      : tipo === "peligro"
      ? "#FFFFFF"
      : c.primario;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: fondo,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          alignItems: "center",
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <RNText style={{ color, fontSize: 16, fontWeight: "600" }}>{titulo}</RNText>
    </Pressable>
  );
}

export function Tarjeta({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, esOscuro } = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: c.tarjeta,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: c.borde,
        },
        !esOscuro && {
          shadowColor: c.sombra,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SelectorTema() {
  const { c, preferencia, setPreferencia } = useTema();
  const opciones = [
    { k: "sistema", t: "Auto" },
    { k: "claro", t: "☀️ Claro" },
    { k: "oscuro", t: "🌙 Oscuro" },
  ] as const;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: c.campo,
        borderRadius: 12,
        padding: 4,
      }}
    >
      {opciones.map((o) => {
        const activo = preferencia === o.k;
        return (
          <Pressable
            key={o.k}
            onPress={() => setPreferencia(o.k)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: 9,
              alignItems: "center",
              backgroundColor: activo ? c.tarjeta : "transparent",
            }}
          >
            <RNText
              style={{
                color: activo ? c.texto : c.suave,
                fontWeight: activo ? "600" : "400",
              }}
            >
              {o.t}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SelectorColor() {
  const { c, acento, setAcento } = useTema();
  const [hex, setHex] = useState(acento);
  const [invalido, setInvalido] = useState(false);

  const elegir = (h: string) => {
    setAcento(h);
    setHex(h);
    setInvalido(false);
  };

  const aplicar = () => {
    const h = normalizarHex(hex);
    if (!h) {
      setInvalido(true);
      return;
    }
    elegir(h);
  };

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {PALETA.map((p) => {
          const activo = p.hex.toLowerCase() === acento.toLowerCase();
          return (
            <Pressable
              key={p.hex}
              onPress={() => elegir(p.hex)}
              accessibilityLabel={p.nombre}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: p.hex,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: activo ? 3 : 0,
                borderColor: c.texto,
              }}
            >
              {activo && (
                <RNText style={{ color: textoSobre(p.hex), fontWeight: "800" }}>
                  ✓
                </RNText>
              )}
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginTop: 14,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: normalizarHex(hex) ?? acento,
            borderWidth: 1,
            borderColor: c.borde,
          }}
        />
        <Campo
          value={hex}
          onChangeText={(t) => {
            setHex(t);
            setInvalido(false);
          }}
          placeholder="#E8587C"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={{ flex: 1 }}
        />
        <Boton titulo="Aplicar" tipo="suave" onPress={aplicar} />
      </View>

      {invalido && (
        <RNText style={{ color: c.peligro, marginTop: 8 }}>
          Código no válido. Usa el formato #RRGGBB, por ejemplo #3E63DD.
        </RNText>
      )}

      <Boton
        titulo="Restablecer color"
        tipo="texto"
        onPress={() => elegir(ACENTO_POR_DEFECTO)}
        style={{ marginTop: 6 }}
      />
    </View>
  );
}