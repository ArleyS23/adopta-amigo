import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPet, updatePetRequest } from "../services/petsService";
import { uploadPetImage } from "../services/uploadsService";

const SIZE_OPTIONS = ["pequeno", "mediano", "grande"];
const VACCINE_OPTIONS = [
  "Rabia",
  "Parvovirus",
  "Moquillo",
  "Hepatitis",
  "Leptospirosis",
  "Triple felina",
];

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "pending", label: "Pendiente" },
  { value: "adoptado", label: "Adoptado" },
];

const schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  age: z.coerce.number().min(0, "Edad invalida").max(30, "Edad muy alta"),
  description: z.string().min(5, "Agrega una descripcion"),
  city: z.string().optional(),
  breed: z.string().optional(),
  color: z.string().optional(),
  size: z.enum(SIZE_OPTIONS).optional(),
  vaccines: z.array(z.string()).optional(),
  contact: z.string().email("Email invalido").optional().or(z.literal("").transform(() => undefined)),
  imageUrl: z.string().url("URL invalida").optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(STATUS_OPTIONS.map((opt) => opt.value)).optional(),
});

export default function EditPet() {
  const { id } = useParams();
  const { user, rsaReady, signSecure, rsaPublicKey, profile, getIdToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pet, setPet] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { vaccines: [] } });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPet(id);
        setPet(data);
        form.reset({
          name: data.name,
          age: data.age,
          description: data.description,
          city: data.city || "",
          breed: data.breed || "",
          color: data.color || "",
          size: data.size || "",
          vaccines: data.vaccines || [],
          contact: data.contact || "",
          imageUrl: data.imageUrl || "",
          status: data.status || "active",
        });
        setPreview(data.imageUrl || "");
      } catch (err) {
        console.error("[EditPet] load", err);
        toast.error(err?.message || "No se pudo cargar la mascota");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate, form]);

  const onSubmit = async (values) => {
    if (!user || !pet) {
      toast.error("Tu sesión no está lista");
      return;
    }
    const isOwner = user.uid === pet.ownerId;
    if (isOwner && !rsaReady) {
      toast.error("Preparando llaves RSA, intenta en unos segundos");
      return;
    }
    try {
      setSaving(true);
      toast.loading("Guardando cambios…", { id: "edit" });
      const token = await getIdToken();
      if (!token) {
        toast.error("Tu sesión no está lista");
        return;
      }
      const vaccines = values.vaccines ? (Array.isArray(values.vaccines) ? values.vaccines : [values.vaccines]) : [];
      let imageUrl = values.imageUrl || pet.imageUrl || null;
      if (imageFile) {
        const { url } = await uploadPetImage(imageFile, token);
        imageUrl = url;
      }
      const payload = {
        name: values.name,
        age: Number(values.age),
        description: values.description,
        city: values.city || null,
        breed: values.breed || null,
        color: values.color || null,
        size: values.size || null,
        vaccines,
        contact: values.contact || null,
        imageUrl,
        status: values.status || pet.status || "active",
        ownerName: pet.ownerName,
        ownerPublicKey: pet.ownerPublicKey,
      };

      if (isOwner) {
        payload.ownerName = profile?.displayName || user.displayName || user.email || "Usuario";
        payload.ownerPublicKey = rsaPublicKey;
        payload.contactSignature = values.contact ? await signSecure(values.contact) : null;
      }

      await updatePetRequest(id, payload, token);
      toast.success("Publicación actualizada", { id: "edit" });
      navigate(`/pet/${id}`);
    } catch (err) {
      console.error("[EditPet] submit", err);
      toast.error(err.message || "No se pudo guardar", { id: "edit" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setImageFile(file || null);
    setPreview(file ? URL.createObjectURL(file) : pet?.imageUrl || "");
  };

  if (loading) return <div className="card p-6 mt-10">Cargando…</div>;

  return (
    <div className="card max-w-2xl mx-auto p-6 mt-6">
      <h1 className="text-2xl font-bold mb-4">Editar publicación</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input className="input" {...form.register("name")} />
          {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Edad (años)</label>
          <input className="input" type="number" {...form.register("age")} />
          {form.formState.errors.age && <p className="text-red-500 text-sm">{form.formState.errors.age.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripción</label>
          <textarea className="input" rows="3" {...form.register("description")} />
          {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input className="input" {...form.register("city")} />
        </div>
        <div>
          <label className="label">Raza</label>
          <input className="input" {...form.register("breed")} />
        </div>
        <div>
          <label className="label">Color</label>
          <input className="input" {...form.register("color")} />
        </div>
        <div>
          <label className="label">Tamaño</label>
          <select className="input" {...form.register("size")}> 
            <option value="">Selecciona</option>
            {SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" {...form.register("status")}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Email de contacto</label>
          <input className="input" {...form.register("contact")} />
          {form.formState.errors.contact && <p className="text-red-500 text-sm">{form.formState.errors.contact.message}</p>}
        </div>
        <div className="sm:col-span-2 space-y-2">
          <label className="label">Foto</label>
          <input className="input" type="file" accept="image/*" onChange={handleImageChange} />
          <input className="input" {...form.register("imageUrl")} placeholder="https://example.com/mascota.jpg" />
          {form.formState.errors.imageUrl && <p className="text-red-500 text-sm">{form.formState.errors.imageUrl.message}</p>}
          {preview && <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded" />}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Vacunas</label>
          <div className="flex flex-wrap gap-3">
            {VACCINE_OPTIONS.map((vac) => (
              <label key={vac} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" value={vac} {...form.register("vaccines")} />
                {vac}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
