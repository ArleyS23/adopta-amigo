import { Link } from "react-router-dom";

const PLACEHOLDER = "https://placehold.co/600x400?text=Mascota";
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/api$/, "");

const STATUS_LABELS = {
  active: "Activo",
  pending: "Pendiente",
  adoptado: "Adoptado",
};

const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function PetCard({
  pet,
  onContact,
  canDelete = false,
  onDelete,
  deleting = false,
  onSave,
  saved = false,
  onChat,
  canChangeStatus = false,
  onChangeStatus,
}) {
  const imageSrc = pet.imageUrl
    ? (pet.imageUrl.startsWith("/uploads/") ? `${API_ORIGIN}${pet.imageUrl}` : pet.imageUrl)
    : PLACEHOLDER;
  const contactLabel = pet.contact ? (
    <a className="text-primary underline" href={`mailto:${pet.contact}`}>{pet.contact}</a>
  ) : (
    <span className="text-gray-500">No disponible</span>
  );

  return (
    <article className="card overflow-hidden transition">
      <img
        src={imageSrc}
        alt={pet.name}
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{pet.name}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="badge">{pet.age} anos</span>
              {pet.city && <span className="badge">{pet.city}</span>}
              {pet.status && <span className="badge">{STATUS_LABELS[pet.status] || pet.status}</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Publicada el {formatDate(pet.createdAt)} por {pet.ownerName || pet.ownerId || "desconocido"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mt-3">{pet.description}</p>
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Contacto:</span> {contactLabel}
            {pet.contact && pet.contactVerified && (
              <span className="ml-2 badge text-xs bg-green-100 text-green-700">RSA verificado</span>
            )}
          </div>
          {(pet.breed || pet.color || pet.size) && (
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              {pet.breed && <span className="badge">{pet.breed}</span>}
              {pet.color && <span className="badge">{pet.color}</span>}
              {pet.size && <span className="badge">{pet.size}</span>}
            </div>
          )}
          {Array.isArray(pet.vaccines) && pet.vaccines.length > 0 && (
            <div>
              <span className="font-semibold">Vacunas:</span> {pet.vaccines.join(", ")}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/pet/${pet.id}`} className="btn-ghost">Ver perfil</Link>
          {onChat && <button onClick={onChat} className="btn-ghost">Chat</button>}
          {onContact && <button onClick={onContact} className="btn-ghost">Contacto</button>}
          {onSave && (
            <button onClick={onSave} className="btn-ghost">
              {saved ? "Quitar de pendientes" : "Guardar"}
            </button>
          )}
          {canDelete && (
            <>
              <Link to={`/pet/${pet.id}/edit`} className="btn-ghost">Editar</Link>
              <button onClick={onDelete} className="btn-danger" disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          )}
          {canChangeStatus && onChangeStatus && (
            <button onClick={onChangeStatus} className="btn-ghost">
              Cambiar estado ({STATUS_LABELS[pet.status] || pet.status})
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
