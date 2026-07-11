"use client";

import { useRef, useState } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage } from "@/hooks/useOrders";
import { formatDateTime } from "@/lib/utils";
import type { OrderMessage } from "@/types";
import toast from "react-hot-toast";

interface Props {
  orderId: string;
  messages: OrderMessage[];
}

export function OrderChat({ orderId, messages }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate: sendMessage, isPending } = useSendMessage();

  const handleSendText = () => {
    if (!text.trim()) return;
    sendMessage(
      { orderId, content: text.trim(), type: "text" },
      {
        onSuccess: () => setText(""),
        onError: () => toast.error("Erro ao enviar mensagem"),
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendMessage(
      { orderId, type: "image", file },
      {
        onSuccess: () => { if (fileRef.current) fileRef.current.value = ""; },
        onError: () => toast.error("Erro ao enviar imagem"),
      }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atualização ainda</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1 bg-muted/40 rounded-lg p-3">
            {msg.type === "image" && msg.image_url ? (
              <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={msg.image_url}
                  alt="Imagem da OS"
                  className="max-h-60 rounded-md object-cover hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            )}
            <p className="text-xs text-muted-foreground">{formatDateTime(msg.created_at)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end border-t pt-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicionar comentário..."
          rows={2}
          className="resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendText();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <Button size="icon" onClick={handleSendText} disabled={isPending || !text.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
