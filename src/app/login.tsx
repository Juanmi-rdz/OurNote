import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useTema } from "../lib/tema";
import { Boton, Campo, Texto } from "../components/ui";

function traducir(e: any) {
  switch (e?.code) {
    case "auth/invalid-email":
    case "auth/missing-email":
      return "El email no es válido.";
    case "auth/missing-password":
      return "Escribe la contraseña.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese email ya tiene una cuenta.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet.";
    default:
      return `Algo ha salido mal (${e?.code ?? "sin código"}).`;
  }
}

export default function Login() {
  const { c } = useTema();
  const [registro, setRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);

  // Al iniciar sesión, el layout te lleva solo a la pantalla principal
  const enviar = async () => {
    if (cargando) return;
    setError("");
    setAviso("");
    setCargando(true);
    try {
      if (registro) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        if (nombre.trim()) {
          await updateProfile(cred.user, { displayName: nombre.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      setError(traducir(e));
      setCargando(false);
    }
  };

  const recuperar = async () => {
    setError("");
    setAviso("");
    if (!email.trim()) {
      setError("Escribe tu email arriba y vuelve a pulsar.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAviso(
        "Si existe una cuenta con ese email, recibirás un correo para restablecer la contraseña."
      );
    } catch (e: any) {
      setError(traducir(e));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 28,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Texto style={{ fontSize: 60 }}>📓</Texto>
          <Texto style={{ fontSize: 32, fontWeight: "800", marginTop: 6 }}>
            OurNote
          </Texto>
          <Texto style={{ color: c.suave, marginTop: 4, textAlign: "center" }}>
            Notas, listas y mucho más, en grupo
          </Texto>
        </View>

        {registro && (
          <Campo
            placeholder="Tu nombre"
            value={nombre}
            onChangeText={setNombre}
          />
        )}
        <Campo
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Campo
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? (
          <Texto style={{ color: c.peligro, textAlign: "center" }}>{error}</Texto>
        ) : null}
        {aviso ? (
          <Texto style={{ color: c.suave, textAlign: "center" }}>{aviso}</Texto>
        ) : null}

        <Boton
          titulo={
            cargando
              ? "Un momento..."
              : registro
              ? "Crear cuenta"
              : "Entrar"
          }
          onPress={enviar}
        />

        {!registro && (
          <Pressable onPress={recuperar} hitSlop={8}>
            <Texto style={{ color: c.suave, textAlign: "center", fontSize: 14 }}>
              ¿Olvidaste tu contraseña?
            </Texto>
          </Pressable>
        )}

        <Boton
          titulo={registro ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
          tipo="texto"
          onPress={() => {
            setRegistro(!registro);
            setError("");
            setAviso("");
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}