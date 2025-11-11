const PLACEHOLDER = "https://placehold.co/600x400?text=Mascota";

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
}) {
  const imageSrc = pet.imageUrl || PLACEHOLDER;
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
              {pet.status && <span className="badge">{pet.status}</span>}
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
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-between">
          {onContact && <button onClick={onContact} className="btn-ghost">Mensaje</button>}
          <div className="flex gap-2">
            {onSave && (
              <button onClick={onSave} className="btn-ghost">
                {saved ? "Quitar de pendientes" : "Guardar"}
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="btn-danger" disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
