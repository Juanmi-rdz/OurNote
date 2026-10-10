import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type Nota = { id: string; titulo: string; creadoEn?: any };

export type TipoBloque =
  | "texto"
  | "lista"
  | "encuesta"
  | "imagen"
  | "valoracion"
  | "gastos"
  | "cuentaatras"
  | "ubicacion"
  | "audio"
  | "dibujo";

export type Bloque = {
  id: string;
  tipo: TipoBloque;
  orden: number;
  [campo: string]: any;
};

const notasRef = (grupoId: string) =>
  collection(db, "groups", grupoId, "notas");
const bloquesRef = (grupoId: string, notaId: string) =>
  collection(db, "groups", grupoId, "notas", notaId, "bloques");

// ---------- Notas ----------
export async function crearNota(grupoId: string, titulo: string) {
  const ref = await addDoc(notasRef(grupoId), {
    titulo,
    creadoPor: auth.currentUser!.uid,
    creadoEn: serverTimestamp(),
  });
  return ref.id;
}

export function escucharNotas(
  grupoId: string,
  alCambiar: (notas: Nota[]) => void
) {
  return onSnapshot(notasRef(grupoId), (snap) => {
    const notas = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Nota));
    const t = (n: Nota) => n.creadoEn?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    notas.sort((a, b) => t(b) - t(a));
    alCambiar(notas);
  });
}

export function escucharNota(
  grupoId: string,
  notaId: string,
  alCambiar: (n: Nota | null) => void
) {
  return onSnapshot(doc(db, "groups", grupoId, "notas", notaId), (snap) =>
    alCambiar(snap.exists() ? ({ id: snap.id, ...snap.data() } as Nota) : null)
  );
}

export function cambiarTitulo(grupoId: string, notaId: string, titulo: string) {
  return updateDoc(doc(db, "groups", grupoId, "notas", notaId), { titulo });
}

export async function borrarNota(grupoId: string, notaId: string) {
  const bloques = await getDocs(bloquesRef(grupoId, notaId));
  const batch = writeBatch(db);
  bloques.docs.forEach((b) => batch.delete(b.ref));
  batch.delete(doc(db, "groups", grupoId, "notas", notaId));
  await batch.commit();
}

// ---------- Bloques ----------
export function escucharBloques(
  grupoId: string,
  notaId: string,
  alCambiar: (b: Bloque[]) => void
) {
  return onSnapshot(bloquesRef(grupoId, notaId), (snap) => {
    const bloques = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bloque));
    bloques.sort((a, b) => a.orden - b.orden);
    alCambiar(bloques);
  });
}

function contenidoInicial(tipo: TipoBloque): Record<string, any> {
  switch (tipo) {
    case "texto":
      return { texto: "" };
    case "lista":
      return { titulo: "", items: [] };
    case "encuesta":
      return {
        pregunta: "",
        opciones: [
          { id: "a", texto: "" },
          { id: "b", texto: "" },
        ],
        votos: {},
      };
    case "audio":
      return { titulo: "", base64: null, duracion: 0, version: 0 };
    case "valoracion":
      return { titulo: "", puntuaciones: {} };
          case "gastos":
      return { titulo: "", items: [] };
    case "cuentaatras":
      return { titulo: "", fecha: "" };
    case "ubicacion":
      return { nombre: "", lat: null, lng: null };
    case "dibujo":
      return { trazos: [] };
    default:
      return {};
  }
}

export function anadirBloque(
  grupoId: string,
  notaId: string,
  tipo: TipoBloque,
  extra: Record<string, any> = {}
) {
  return addDoc(bloquesRef(grupoId, notaId), {
    tipo,
    orden: Date.now(),
    ...contenidoInicial(tipo),
    ...extra,
  });
}

export function actualizarBloque(
  grupoId: string,
  notaId: string,
  bloqueId: string,
  cambios: Record<string, any>
) {
  return updateDoc(
    doc(db, "groups", grupoId, "notas", notaId, "bloques", bloqueId),
    cambios
  );
}

export function borrarBloque(grupoId: string, notaId: string, bloqueId: string) {
  return deleteDoc(
    doc(db, "groups", grupoId, "notas", notaId, "bloques", bloqueId)
  );
}
export async function moverBloque(
  grupoId: string,
  notaId: string,
  bloques: Bloque[],
  indice: number,
  direccion: -1 | 1
) {
  const j = indice + direccion;
  if (j < 0 || j >= bloques.length) return;
  const a = bloques[indice];
  const b = bloques[j];
  const ref = (id: string) =>
    doc(db, "groups", grupoId, "notas", notaId, "bloques", id);
  const batch = writeBatch(db);
  batch.update(ref(a.id), { orden: b.orden });
  batch.update(ref(b.id), { orden: a.orden });
  await batch.commit();
}