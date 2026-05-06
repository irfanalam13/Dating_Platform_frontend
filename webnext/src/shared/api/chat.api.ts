// chat/api.ts

import axios from "axios";
import type {
  Conversation,
  Message,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "../types/chat.types";

const API = process.env.NEXT_PUBLIC_API_URL;

// 🔐 Token helper
const getAuthHeader = () => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access")
      : null;

  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

// =====================================================
// 💬 START CONVERSATION
// =====================================================
export const startConversation = async (
  profileId: number
): Promise<StartConversationResponse> => {
  const res = await axios.post(
    `${API}/chat/start/${profileId}/`,
    {},
    getAuthHeader()
  );

  return res.data;
};

// =====================================================
// 📋 GET CONVERSATIONS
// =====================================================
export const getConversations = async (): Promise<Conversation[]> => {
  const res = await axios.get(`${API}/chat/`, getAuthHeader());
  return res.data;
};

// =====================================================
// 📨 GET MESSAGES
// =====================================================
export const getMessages = async (
  conversationId: number
): Promise<Message[]> => {
  const res = await axios.get(
    `${API}/chat/${conversationId}/messages/`,
    getAuthHeader()
  );

  return res.data;
};

// =====================================================
// ✉️ SEND MESSAGE
// =====================================================
export const sendMessage = async (
  data: SendMessageRequest
): Promise<SendMessageResponse> => {
  const res = await axios.post(
    `${API}/chat/send/`,
    data,
    getAuthHeader()
  );

  return res.data;
};