# Adopta Amigo

Aplicacion React para publicar mascotas en adopcion usando un backend Express ligero y Firebase Auth para las sesiones.

## Stack
- Frontend: React 19 + Vite + Tailwind utilities.
- Backend: Express + almacenamiento en `server/data/pets.json` (se expone via `/api`).
- Autenticacion y perfiles: Firebase Auth + Firestore (`users/{uid}` guarda nombre, foto, rol, favoritos y llaves RSA).

## Como ejecutar en local
1. Instala dependencias del frontend:
   ```bash
   npm install
   ```
2. Instala dependencias del backend:
   ```bash
   cd server && npm install
   ```
3. Levanta el backend en una terminal:
   ```bash
   npm run api:dev
   ```
   El API queda disponible en `http://localhost:4000/api`.
4. En otra terminal levanta el frontend:
   ```bash
   npm run dev
   ```
5. Si desplegas en Netlify/Vercel, agrega `VITE_API_URL` apuntando a tu backend (por defecto usa `http://localhost:4000/api`).

## Flujo de datos
1. `NewPet` valida con Zod, firma el email de contacto usando RSA (llave privada guardada en el navegador) y envia la mascota al endpoint `POST /api/pets` con estado inicial **activo**.
2. `PetsList` consume `GET /api/pets`, permite filtrar y guardar mascotas. Las tarjetas verifican la firma RSA con la llave publica que se guarda en Firestore.
3. `PetDetails` (`/pet/:id`) y `EditPet` (`/pet/:id/edit`) usan los endpoints `GET /api/pets/:id` y `PATCH /api/pets/:id`. Los admins (campo `role: "admin"` en `users/{uid}`) pueden editar/eliminar cualquier publicacion; los demas solo las propias. `DELETE /api/pets/:id` esta protegido de la misma forma. Las publicaciones manejan estados `activo`, `pendiente` o `adoptado`.
4. `UserDashboard` muestra el perfil (nombre, correo, foto y rol) y sincroniza la lista de favoritos almacenada en Firestore (`savedPets`). Las mascotas guardadas se consultan mediante `GET /api/pets?ids=...`.

## Imagenes
- Puedes pegar una URL directa en el formulario (se guarda tal cual).
- Si prefieres subir archivos, `NewPet` y `EditPet` aceptan imágenes y llaman a `POST /api/uploads`, que devuelve `/uploads/<archivo>`. El backend sirve esa ruta y las tarjetas detectan automáticamente las rutas relativas.
- Limite actual: JPG/PNG/WebP de hasta 5MB.
## Chat
- Desde la tarjeta o el detalle de una mascota puedes abrir un chat con el dueño. Cada conversación se guarda en Firestore, y el dueño ve todas las solicitudes en “Mi espacio” para cambiar el estado (pendiente/activo/adoptado).

## Historia de usuario
- Como voluntario quiero publicar y actualizar mascotas completas (raza, color, tamaño, vacunas) para mantener la informacion clara.
- Como adoptante quiero ver fichas con toda la informacion, guardarlas para despues, ver un perfil detallado y contactar al dueno con confianza gracias al sello RSA.
- Como administrador necesito poder editar o eliminar cualquier publicacion y mantener control centralizado desde el backend.

## Seguridad
- 2FA por correo: si el usuario no verifico su email se redirige a `/verify-email` antes de acceder a rutas protegidas.
- RSA: cada usuario genera un par de llaves al autenticarse; la publica se guarda en Firestore y la privada en el navegador. El email de contacto se firma al crear/editar y las tarjetas verifican la firma.
- Roles: el campo `role` en `users/{uid}` define si un usuario es `admin` o `user`. Puedes cambiarlo desde la consola de Firestore.

## Despliegue
- Frontend: usa Netlify (ya incluye `netlify.toml`). Configura `VITE_API_URL` para que apunte al backend publico.
- Backend: puedes desplegar la carpeta `server/` en cualquier servicio Node (Railway, Render, Fly.io, etc.). Recuerda actualizar `VITE_API_URL` con la URL del API.

