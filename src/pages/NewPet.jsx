import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  age: z.coerce.number().min(0, "Edad invalida").max(30, "Edad muy alta"),
  description: z.string().min(5, "Agrega una descripcion"),
  city: z.string().optional(),
  contact: z.string().email("Email invalido").optional(),
  imageUrl: z.string().url("URL invalida").optional().or(z.literal("").transform(() => undefined)),
});

const PLACEHOLDER = "https://placehold.co/600x400?text=Mascota";

export default function NewPet() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user, rsaReady, signSecure, rsaPublicKey, profile } = useAuth();

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

      const doc = {
        name: data.name,
        age: Number(data.age),
        description: data.description,
        city: data.city || null,
        contact: data.contact || null,
        ownerId: user.uid,
        ownerName: profile?.displayName || user.displayName || user.email || "Usuario",
        status: "available",
        imageUrl: data.imageUrl || PLACEHOLDER,
        createdAt: serverTimestamp(),
        ownerPublicKey: rsaPublicKey,
      };
      if (data.contact) {
        doc.contactSignature = await signSecure(data.contact);
      }

      await addDoc(collection(db, "pets"), doc);

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
          <label className="label">Email de contacto (opcional)</label>
          <input className="input" placeholder="dueno@email.com" {...register("contact")} />
          {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="label">URL de la foto (opcional)</label>
          <input className="input" placeholder="https://example.com/mascota.jpg" {...register("imageUrl")} />
          {errors.imageUrl && <p className="text-red-500 text-sm mt-1">{errors.imageUrl.message}</p>}
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
