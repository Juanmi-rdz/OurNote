# 📓 OurNote

**Notas, listas y mucho más, en grupo.** App móvil para iPhone y Android donde varias personas (una pareja, amigos, familia) comparten bloques de notas que se sincronizan en tiempo real.

![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth_%2B_Firestore-FFCA28?logo=firebase&logoColor=black)

<!--
  CAPTURAS: crea la carpeta docs/ con 3 o 4 capturas de la app y descomenta esto.

  <p align="center">
    <img src="docs/grupos.png" width="200" />
    <img src="docs/nota.png" width="200" />
    <img src="docs/oscuro.png" width="200" />
    <img src="docs/ajustes.png" width="200" />
  </p>
-->

## ¿Qué es?

Nació como una app para uso personal: compartir con mi pareja la lista de la compra, las series pendientes, planes y gastos. Después la amplié para que cada persona pueda tener **varios grupos** (pareja, amigos, familia), cada uno con sus propias notas.

Cada nota es un documento libre formado por **bloques** que se pueden combinar y reordenar, al estilo de Notion.

## Funcionalidades

### Grupos y cuenta
- Registro, inicio de sesión y recuperación de contraseña por email.
- Sesión persistente: solo se cierra desde Ajustes.
- Varios grupos por usuario. Se crean y se entra con un **código de invitación** de 6 caracteres, que se comparte desde el menú nativo del móvil.
- Ajustes de grupo: renombrar, ver miembros y salir (el último miembro que sale borra el grupo con todas sus notas).
- Borrado de cuenta desde la app, con reautenticación (requisito de App Store y Google Play).

### Bloques de nota

| Bloque | Qué hace |
|---|---|
| 📝 Texto | Párrafo libre |
| ☑️ Lista | Checklist con elementos que se tachan |
| 📊 Encuesta | Opciones editables y un voto por persona, con barras de resultado |
| ⭐ Valoración | Cada miembro puntúa de 1 a 5 estrellas |
| 💸 Gastos a medias | Apunta quién pagó cada gasto y calcula quién debe a quién |
| ⏳ Cuenta atrás | Días hasta una fecha (o desde ella, como contador de días juntos) |
| 📍 Ubicación | Nombre del sitio y coordenadas, con acceso a mapas |
| 🖼️ Imagen | Foto de la galería, comprimida y redimensionada en el móvil |
| ✏️ Dibujo | Lienzo con trazos vectoriales de varios colores |
| 🎙️ Audio | Notas de voz de hasta 90 segundos, con reproductor |

Los bloques se pueden **reordenar** y borrar. Todo se actualiza al instante en el móvil de los demás miembros.

### Diseño
- Modo **claro, oscuro o automático** (sigue el del sistema).
- **Color de la app personalizable** por usuario: paleta de 10 colores o cualquier código hexadecimal. El color del texto sobre los botones se calcula según la luminancia del color elegido para mantener el contraste.
- Buscador de notas, fecha de creación y borrado automático de las notas vacías.

## Tecnologías

- **Expo SDK 57** y **React Native 0.86** (React 19), con **TypeScript**.
- **Expo Router** para la navegación basada en archivos, con rutas protegidas según la sesión (`Stack.Protected`).
- **Firebase Authentication** y **Cloud Firestore** como backend, con escuchas en tiempo real (`onSnapshot`).
- `react-native-svg` para el dibujo, `expo-audio` para grabar y reproducir, `expo-image-picker` y `expo-image-manipulator` para las imágenes, `expo-location` para la ubicación.
- **GitHub Actions** para compilar el APK de Android y un IPA de iOS sin firmar.

## Arquitectura

### Modelo de datos

```
groups/{grupoId}
  ├─ nombre, codigo, miembros: [uid], nombres: { uid: nombre }
  └─ notas/{notaId}
       ├─ titulo, creadoPor, creadoEn
       └─ bloques/{bloqueId}
            └─ tipo, orden, ...campos propios de cada tipo

invitaciones/{codigo}
  └─ groupId
```

### Decisiones de diseño

- **Un documento por bloque.** Si dos personas editan bloques distintos a la vez, los cambios no se pisan. Es lo que hace posible la edición simultánea sin un sistema de resolución de conflictos.
- **Votos y valoraciones con rutas de campo** (`votos.<uid>`, `puntuaciones.<uid>`). Cada persona escribe solo su propio valor, así nunca sobrescribe el de los demás.
- **Colección `invitaciones` aparte.** Con reglas de seguridad reales, alguien que no es miembro no puede leer un grupo, así que no podría buscarlo por su código. Un documento por código, legible solo conociendo el código, resuelve la unión sin abrir la lectura de grupos.
- **Campos de texto que no se pisan mientras escribes.** Cada campo guarda al perder el foco y solo se sincroniza con el valor remoto si no lo estás editando.
- **Dibujo vectorial.** Se guardan los trazos como rutas SVG sobre un lienzo lógico de 300×300 que se escala a cualquier pantalla. Es ligero y se puede reeditar.
- **Tema como contexto de React**, con la paleta derivada del color elegido (versión aclarada en modo oscuro y fondo suave calculado por mezcla de color).

## Seguridad

Las reglas de Firestore están en [`firestore.rules`](./firestore.rules):

- Solo los miembros de un grupo pueden leer o escribir sus notas y bloques.
- Una persona no miembro solo puede añadirse a sí misma a un grupo, y nada más.
- Las invitaciones se pueden consultar por código pero no listar.
- Un grupo solo puede borrarse cuando queda un único miembro.

La configuración web de Firebase va dentro de la app, como en cualquier app cliente: no es un secreto, y la protección real de los datos la dan estas reglas.

## Ejecutarlo en local

Necesitas Node.js 20 o superior y la app **Expo Go** en el móvil (o un emulador).

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com) y añade una app web.
2. Activa **Authentication → Correo y contraseña** y crea una base de datos **Firestore**.
3. Publica las reglas de [`firestore.rules`](./firestore.rules) en Firestore → Reglas.
4. Copia tu configuración de Firebase en `src/lib/firebase.ts`.
5. Instala y arranca:

```bash
npm install
npx expo start
```

Escanea el código QR con el móvil.

## Compilar la app

### Android (APK)

El repositorio incluye un workflow de GitHub Actions: en **Actions → APK Android → Run workflow** se compila un APK que se descarga desde la sección *Artifacts* de la ejecución.

### iOS

El workflow **IPA sin firmar** genera un `.ipa` que se puede instalar con [AltStore](https://altstore.io). Con un Apple ID gratuito las apps caducan a los 7 días y no hay notificaciones push ni widgets. Para distribuirla con TestFlight o App Store hace falta una cuenta de Apple Developer.

## Limitaciones conocidas

- Las **imágenes y los audios se guardan dentro del documento de Firestore** (límite de 1 MB), comprimidos. Funciona bien para grupos pequeños, pero para escalar habría que pasarlos a Cloud Storage.
- Los gastos se dividen **a partes iguales** entre todos los miembros.
- Si alguien sale de un grupo, sus votos y gastos permanecen en las notas.
- Las listas guardan el array completo, así que dos personas editando el mismo bloque en el mismo instante podrían pisarse.
- El color de la app se guarda en el dispositivo, no en la cuenta.

## Próximos pasos

- [ ] Widgets de pantalla de inicio (dibujo rápido para la otra persona).
- [ ] Notificaciones push cuando alguien cambia una nota.
- [ ] Migrar imágenes y audios a Cloud Storage.
- [ ] Reordenar bloques arrastrando.
- [ ] Tests automáticos (cálculo de gastos, validación de fechas).
- [ ] Plantillas de nota (compra, series, viaje).
- [ ] Traducción a más idiomas.

## Cómo se ha desarrollado

Proyecto construido con ayuda de un asistente de IA (Claude, de Anthropic) para el andamiaje y la revisión del código. El diseño de las funciones, las pruebas con usuarios reales y las decisiones de producto son mías.

## Licencia

[MIT](./LICENSE)
