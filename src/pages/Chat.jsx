import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { listenConversation, listenMessages, sendMessage } from "../services/conversationsService";

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    const unsubConv = listenConversation(conversationId, (data) => {
      if (!data) {
        toast.error("Conversación no encontrada");
        navigate("/");
      } else {
        setConversation(data);
      }
    });
    const unsubMsgs = listenMessages(conversationId, setMessages);
    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [conversationId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return null;
  if (!conversation) return <div className="card p-6 mt-10">Cargando chat…</div>;
  const participantIds = [conversation.ownerId, conversation.adopterId];
  if (!participantIds.includes(user.uid)) {
    return <div className="card p-6 mt-10">No tienes acceso a este chat.</div>;
  }

  const otherName = user.uid === conversation.ownerId ? conversation.adopterName : conversation.ownerName;

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await sendMessage(conversationId, user.uid, text);
      setText("");
    } catch (err) {
      console.error("[Chat] sendMessage", err);
      toast.error(err.message || "No se pudo enviar");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 mt-6">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase">Chat con</p>
          <p className="text-lg font-semibold">{otherName}</p>
          <p className="text-xs text-gray-500">Mascota: {conversation.petName}</p>
        </div>
        <Link className="btn-ghost" to={`/pet/${conversation.petId}`}>Ver publicación</Link>
      </div>

      <div className="card p-4 h-[60vh] overflow-y-auto space-y-2">
        {messages.length === 0 && <p className="text-sm text-gray-500">Aún no hay mensajes.</p>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.senderId === user.uid ? "bg-primary/20 ml-auto" : "bg-gray-100"}`}
          >
            <p>{msg.text}</p>
            <p className="text-[10px] text-gray-500 mt-1">{msg.createdAt?.toDate?.().toLocaleString?.() || "Enviando…"}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="card p-4 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Escribe un mensaje"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary" type="submit">Enviar</button>
      </form>
    </div>
  );
}
