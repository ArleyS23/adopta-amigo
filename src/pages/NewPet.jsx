import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createPet } from "../services/petsService";
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

const schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  age: z.coerce.number().min(0, "Edad invalida").max(30, "Edad muy alta"),
  description: z.string().min(5, "Agrega una descripcion"),
  city: z.string().optional(),
  breed: z.string().optional(),
  color: z.string().optional(),
  size: z.enum(SIZE_OPTIONS).optional(),
  vaccines: z.array(z.string()).optional(),
  contact: z.string().email("Email invalido").optional(),
  imageUrl: z.string().url("URL invalida").optional().or(z.literal("").transform(() => undefined)),
});

const PLACEHOLDER = "https://placehold.co/600x400?text=Mascota";

export default function NewPet() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { vaccines: [] },
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const nav = useNavigate();
  const { user, rsaReady, signSecure, rsaPublicKey, profile } = useAuth();

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const onSubmit = async (data) => {
    console.log("[NewPet] submit start", data);

    if (!user) {
      console.warn("[NewPet] no user");
      toast.error("Debes iniciar sesion para publicar.");
      nav("/login");
      return;
    }
    if (!rsaReady || !rsaPublicKey) {
      toast.error("Preparando llaves de seguridad, intenta en unos segundos.");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Publicando...", { id: "pub" });

      const vaccines = data.vaccines
        ? Array.isArray(data.vaccines) ? data.vaccines : [data.vaccines]
        : [];

      let imageUrl = data.imageUrl || null;
      if (imageFile) {
        const { url } = await uploadPetImage(imageFile, user);
        imageUrl = url;
      }

      const doc = {
        name: data.name,
        age: Number(data.age),
        description: data.description,
        city: data.city || null,
        breed: data.breed || null,
        color: data.color || null,
        size: data.size || null,
        vaccines,
        contact: data.contact || null,
        ownerId: user.uid,
        ownerName: profile?.displayName || user.displayName || user.email || "Usuario",
        status: "active",
        imageUrl: imageUrl || PLACEHOLDER,
        createdAt: new Date().toISOString(),
        ownerPublicKey: rsaPublicKey,
      };
      if (data.contact) {
        doc.contactSignature = await signSecure(data.contact);
      }

      await createPet(doc, user, profile?.role || "user");

      toast.success("Mascota publicada :)", { id: "pub" });
      console.log("[NewPet] success, going home");
      nav("/");
    } catch (e) {
      console.error("[NewPet] ERROR", e);
      toast.error(e?.message || "Error al publicar", { id: "pub" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-2xl mx-auto p-6 mt-6">
      <h1 className="text-2xl font-bold mb-4">Publicar mascota</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input className="input" placeholder="Luna" {...register("name")} />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Edad (anos)</label>
          <input className="input" type="number" placeholder="2" {...register("age")} />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripcion</label>
          <textarea className="input" rows="3" placeholder="Carinosa, vacunada..." {...register("description")} />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input className="input" placeholder="Bogota" {...register("city")} />
        </div>
        <div>
          <label className="label">Raza</label>
          <input className="input" placeholder="Criolla" {...register("breed")} />
        </div>
        <div>
          <label className="label">Color</label>
          <input className="input" placeholder="Blanco con negro" {...register("color")} />
        </div>
        <div>
          <label className="label">TamaÃ±o</label>
          <select className="input" defaultValue="" {...register("size")}>
            <option value="">Selecciona</option>
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Email de contacto (opcional)</label>
          <input className="input" placeholder="dueno@email.com" {...register("contact")} />
          {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact.message}</p>}
        </div>

        <div className="sm:col-span-2 space-y-2">
          <label className="label">Foto de la mascota</label>
          <input className="input" type="file" accept="image/*" onChange={handleImageChange} />
          <input className="input mt-2" placeholder="https://example.com/mascota.jpg" {...register("imageUrl")} />
          {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>}
          {preview && <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded" />}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Vacunas recibidas</label>
          <div className="flex flex-wrap gap-3">
            {VACCINE_OPTIONS.map((vac) => (
              <label key={vac} className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" value={vac} {...register("vaccines")} />
                {vac}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={()=>nav("/")} className="btn-ghost">Cancelar</button>
          <button className="btn-primary" type="submit" disabled={loading || !rsaReady}>
            {loading ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
