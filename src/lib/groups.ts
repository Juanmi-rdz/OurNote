import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { borrarNota } from "./notas";

export type Grupo = {
  id: string;
  nombre: string;
  codigo: string;
  miembros: string[];
  nombres?: Record<string, string>;
};

function generarCodigo() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return codigo;
}

// Crea el grupo y su invitación a la vez. Si el código ya existe, reintenta.
export async function crearGrupo(nombre: string) {
  const uid = auth.currentUser!.uid;
  for (let intento = 0; intento < 5; intento++) {
    const grupoRef = doc(collection(db, "groups"));
    const codigo = generarCodigo();
    const batch = writeBatch(db);
    batch.set(grupoRef, {
      nombre,
      codigo,
      miembros: [uid],
      creadoEn: serverTimestamp(),
    });
    batch.set(doc(db, "invitaciones", codigo), { groupId: grupoRef.id });
    try {
      await batch.commit();
      return grupoRef.id;
    } catch (e) {
      if (intento === 4) throw e;
    }
  }
  throw new Error("No se pudo crear el grupo");
}

export async function unirseAGrupo(codigo: string) {
  const uid = auth.currentUser!.uid;
  const inv = await getDoc(
    doc(db, "invitaciones", codigo.trim().toUpperCase())
  );
  if (!inv.exists()) throw new Error("Código no válido");

  const groupId = inv.data().groupId as string;
  await updateDoc(doc(db, "groups", groupId), { miembros: arrayUnion(uid) });
  return groupId;
}

// Para grupos creados antes de este cambio: crea su invitación si falta
export async function asegurarInvitacion(groupId: string, codigo: string) {
  const ref = doc(db, "invitaciones", codigo);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { groupId });
}

export function escucharMisGrupos(
  alCambiar: (grupos: Grupo[]) => void,
  alFallar?: (e: Error) => void
) {
  const uid = auth.currentUser!.uid;
  const q = query(
    collection(db, "groups"),
    where("miembros", "array-contains", uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Grupo)));
    },
    alFallar
  );
}

export function escucharGrupo(
  id: string,
  alCambiar: (grupo: Grupo | null) => void
) {
  return onSnapshot(
    doc(db, "groups", id),
    (snap) => {
      alCambiar(
        snap.exists() ? ({ id: snap.id, ...snap.data() } as Grupo) : null
      );
    },
    () => alCambiar(null)
  );
}

export function registrarNombre(grupoId: string) {
  const u = auth.currentUser!;
  const nombre = u.displayName || (u.email ?? "").split("@")[0];
  return updateDoc(doc(db, "groups", grupoId), {
    [`nombres.${u.uid}`]: nombre,
  });
}
export function cambiarNombreGrupo(id: string, nombre: string) {
  return updateDoc(doc(db, "groups", id), { nombre });
}

// Sale del grupo. Si eres el último miembro, borra el grupo entero.
export async function salirDelGrupo(groupId: string) {
  const uid = auth.currentUser!.uid;
  const ref = doc(db, "groups", groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  if ((data.miembros as string[]).length <= 1) {
    const notas = await getDocs(collection(db, "groups", groupId, "notas"));
    for (const n of notas.docs) await borrarNota(groupId, n.id);

    const invRef = doc(db, "invitaciones", data.codigo);
    const inv = await getDoc(invRef);
    const batch = writeBatch(db);
    if (inv.exists()) batch.delete(invRef);
    batch.delete(ref);
    await batch.commit();
  } else {
    await updateDoc(ref, {
      miembros: arrayRemove(uid),
      [`nombres.${uid}`]: deleteField(),
    });
  }
}