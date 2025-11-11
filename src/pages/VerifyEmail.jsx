import { useState } from "react";
import toast from "react-hot-toast";
import { sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const sendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      setSending(true);
      await sendEmailVerification(auth.currentUser);
      toast.success("Correo de verificación enviado. Revisa tu bandeja.");
    } catch (err) {
      console.error("[VerifyEmail] sendVerification", err);
      toast.error(err.message || "No se pudo enviar el correo");
    } finally {
      setSending(false);
    }
  };

  const checkStatus = async () => {
    if (!auth.currentUser) return;
    try {
      setChecking(true);
      await refreshUser();
      if (auth.currentUser.emailVerified) {
        toast.success("Correo verificado. ¡Listo!");
        navigate("/");
      } else {
        toast("Aún no detectamos la verificación. Intenta de nuevo en unos segundos.");
      }
    } catch (err) {
      console.error("[VerifyEmail] checkStatus", err);
      toast.error(err.message || "No se pudo verificar");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 card p-6">
      <h1 className="text-2xl font-semibold mb-4">Verificación por correo (2FA)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Enviamos un enlace a <strong>{user.email}</strong>. Haz clic en el correo para confirmar tu identidad
        y luego vuelve a esta pantalla para continuar.
      </p>
      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={sendVerification} disabled={sending}>
          {sending ? "Enviando..." : "Reenviar correo de verificación"}
        </button>
        <button className="btn-ghost w-full" onClick={checkStatus} disabled={checking}>
          {checking ? "Comprobando..." : "Ya verifiqué mi correo"}
        </button>
      </div>
    </div>
  );
}
