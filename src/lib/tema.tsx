import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Preferencia = "sistema" | "claro" | "oscuro";

export const ACENTO_POR_DEFECTO = "#E8587C";

export const PALETA = [
  { nombre: "Rosa", hex: "#E8587C" },
  { nombre: "Rojo", hex: "#E5484D" },
  { nombre: "Naranja", hex: "#F76B15" },
  { nombre: "Amarillo", hex: "#E5A400" },
  { nombre: "Verde", hex: "#30A46C" },
  { nombre: "Turquesa", hex: "#12A594" },
  { nombre: "Azul", hex: "#3E63DD" },
  { nombre: "Violeta", hex: "#8E4EC6" },
  { nombre: "Fucsia", hex: "#D6409F" },
  { nombre: "Grafito", hex: "#5B5B66" },
];

// ---------- Utilidades de color ----------
function aRgb(hex: string): number[] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function aHex(rgb: number[]) {
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

// Mezcla a con b; t es la cantidad de b (0 a 1)
function mezclar(a: string, b: string, t: number) {
  const A = aRgb(a);
  const B = aRgb(b);
  return aHex(A.map((v, i) => v * (1 - t) + B[i] * t));
}

function luminancia(hex: string) {
  const [r, g, b] = aRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Blanco o casi negro, según lo claro que sea el color de fondo
export function textoSobre(hex: string) {
  return luminancia(hex) > 0.4 ? "#1A1420" : "#FFFFFF";
}

// Acepta "#abc", "abc", "#AABBCC"... y devuelve "#AABBCC" o null si no vale
export function normalizarHex(t: string): string | null {
  let h = t.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  }
  return /^[0-9a-fA-F]{6}$/.test(h) ? "#" + h.toUpperCase() : null;
}

// ---------- Paletas ----------
const claro = {
  fondo: "#FBF7F4",
  tarjeta: "#FFFFFF",
  campo: "#F4EEF0",
  texto: "#2A2230",
  suave: "#8B8292",
  borde: "#EDE5E8",
  primario: ACENTO_POR_DEFECTO,
  sobrePrimario: "#FFFFFF",
  primarioSuave: "#FCE6EC",
  peligro: "#D64545",
  estrella: "#F5A623",
  sombra: "#000000",
};

const oscuro: typeof claro = {
  fondo: "#141117",
  tarjeta: "#1F1A24",
  campo: "#2A2430",
  texto: "#F3EEF5",
  suave: "#9D94A5",
  borde: "#332C3A",
  primario: ACENTO_POR_DEFECTO,
  sobrePrimario: "#FFFFFF",
  primarioSuave: "#3A2430",
  peligro: "#F06A6A",
  estrella: "#F5B94A",
  sombra: "#000000",
};

export type Colores = typeof claro;

type Ctx = {
  c: Colores;
  esOscuro: boolean;
  preferencia: Preferencia;
  setPreferencia: (p: Preferencia) => void;
  acento: string;
  setAcento: (hex: string) => void;
};

const TemaContext = createContext<Ctx>({
  c: claro,
  esOscuro: false,
  preferencia: "sistema",
  setPreferencia: () => {},
  acento: ACENTO_POR_DEFECTO,
  setAcento: () => {},
});

export function ProveedorTema({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPref] = useState<Preferencia>("sistema");
  const [acento, setAcentoState] = useState(ACENTO_POR_DEFECTO);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem("tema"), AsyncStorage.getItem("acento")])
      .then(([t, a]) => {
        if (t === "claro" || t === "oscuro" || t === "sistema") setPref(t);
        const h = a ? normalizarHex(a) : null;
        if (h) setAcentoState(h);
      })
      .catch(() => {})
      .finally(() => setListo(true));
  }, []);

  // Hace que teclado y alertas nativas sigan también el tema elegido
  useEffect(() => {
    try {
      Appearance.setColorScheme(
        preferencia === "sistema" ? null : preferencia === "oscuro" ? "dark" : "light"
      );
    } catch {}
  }, [preferencia]);

  const esOscuro =
    preferencia === "sistema" ? sistema === "dark" : preferencia === "oscuro";

  const valor = useMemo<Ctx>(() => {
    const base = esOscuro ? oscuro : claro;
    // En modo oscuro se aclara un poco el color para que se lea bien
    const primario = esOscuro ? mezclar(acento, "#FFFFFF", 0.12) : acento;
    return {
      c: {
        ...base,
        primario,
        sobrePrimario: textoSobre(primario),
        primarioSuave: mezclar(base.tarjeta, primario, esOscuro ? 0.28 : 0.14),
      },
      esOscuro,
      preferencia,
      setPreferencia: (p) => {
        setPref(p);
        AsyncStorage.setItem("tema", p).catch(() => {});
      },
      acento,
      setAcento: (hex) => {
        setAcentoState(hex);
        AsyncStorage.setItem("acento", hex).catch(() => {});
      },
    };
  }, [esOscuro, preferencia, acento]);

  if (!listo) return null;
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);