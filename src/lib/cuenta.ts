import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updateProfile,
} from "firebase/auth";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import { salirDelGrupo } from "./groups";

// Cambia mi nombre y lo actualiza en todos mis grupos
export async function guardarMiNombre(nombre: string) {
  const u = auth.currentUser!;
  await updateProfile(u, { displayName: nombre });
  const snap = await getDocs(
    query(collection(db, "groups"), where("miembros", "array-contains", u.uid))
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { [`nombres.${u.uid}`]: nombre }));
  await batch.commit();
}

// Sale de todos los grupos y elimina la cuenta
export async function borrarCuenta(password: string) {
  const u = auth.currentUser!;
  // Firebase exige haber iniciado sesión hace poco para borrar la cuenta
  await reauthenticateWithCredential(
    u,
    EmailAuthProvider.credential(u.email!, password)
  );
  const snap = await getDocs(
    query(collection(db, "groups"), where("miembros", "array-contains", u.uid))
  );
  for (const g of snap.docs) await salirDelGrupo(g.id);
  await deleteUser(u);
}