# Adopta Amigo

Aplicacion React para publicar mascotas en adopcion respaldada por Firebase Auth + Firestore (sin Storage).

## Stack
- **Frontend:** React 19 + Vite + utilidades Tailwind.
- **Autenticacion:** Firebase Auth.
- **Base de datos:** Cloud Firestore (`pets`), donde se guarda toda la metadata, incluida una URL opcional de imagen (puede ser de cualquier hosting/CDN).

## Como ejecutar
```bash
npm install
npm run dev
```
El proyecto utiliza la configuracion de Firebase incluida en `src/firebase.js`; basta con asegurarte de que tu proyecto tenga habilitado Auth y Firestore.

## Flujo de datos
1. `NewPet` valida el formulario con Zod. Si el usuario proporciona una URL de imagen, se almacena tal cual; de lo contrario se usa un placeholder.
2. El documento en Firestore contiene `ownerId`, `imageUrl`, `status`, `createdAt`, claves públicas RSA y la firma del dato de contacto.
3. `PetsList` lee Firestore (ordenado por fecha), permite filtrar localmente, guardar mascotas en tu lista, acceder a un perfil detallado (`/pet/:id`) y borra documentos o los edita desde la UI del dueño. Además verifica la firma RSA para mostrar que el correo de contacto no fue alterado.

> La carpeta `server/` permanece como referencia del backend previo, pero la app actual funciona únicamente con Firebase.

## Historia de usuario
- **Como voluntario que administra adopciones**, quiero publicar mascotas con información verificada y poder editarlas cuando cambie algún dato.
- **Como adoptante**, deseo ver tarjetas con detalles claros de cada mascota (edad, ciudad, estado, contacto verificado), guardarlas en mi lista y poder contactar rápidamente a los dueños.
- **Como equipo de seguridad**, necesito que el acceso esté protegido con autenticación en dos pasos vía correo electrónico y que los datos sensibles se firmen digitalmente con RSA para detectar modificaciones.

## Seguridad
- **Autenticación de dos pasos (2FA)**: tras iniciar sesión con email/contraseña, si el usuario no tiene el correo verificado se le redirige a `/verify-email`, donde puede reenviar el enlace de verificación y confirmar antes de continuar.
- **RSA**: al autenticar por primera vez se generan llaves RSA (2048 bits). La pública se guarda en `users/{uid}` en Firestore y la privada permanece en el navegador. Cada vez que se guarda el correo de contacto de una mascota se firma con la llave privada; las tarjetas verifican la firma con la llave pública del dueño y muestran un badge “RSA verificado”.
