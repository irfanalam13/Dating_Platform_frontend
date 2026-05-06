import React from "react";
import { useChat } from "@/features/chat/hooks/useChat";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
// src/app/(protected)/chat/[conversationId]/page.tsx


interface Props {
  params: {
    conversationId: string;
  };
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Chat Room: {conversationId}</h1>
      {/* Your chat room components and logic go here */}
    </div>
  );
}