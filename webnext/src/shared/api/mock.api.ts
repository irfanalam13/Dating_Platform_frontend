/**
 * Mock API for offline development
 * Simulates backend responses so UI can be tested without running backend
 */

import type { Profile } from "@/shared/types/profile.types";
import type { Conversation, Message, PaginatedResponse } from "@/shared/types/chat.types";

const MOCK_PROFILE: Profile = {
  id: 1,
  user: 1,
  full_name: "Jane Smith",
  bio: "Love hiking, coffee, and good conversations ☕🏔️",
  age: 28,
  gender: "Female",
  city: "San Francisco",
  verified: true,
  is_profile_public: true,
  relationship_intent: "Long-term relationship",
  education: "Bachelor's in Computer Science",
  career: "Product Manager at Tech Startup",
  ethnicity: "South Asian",
  religion_name: "Hindu",
  caste_name: "Brahmin",
  gotra_name: "Vatsa",
  gan: "Devta",
  horoscope: "Libra",
  hobbies: "hiking, photography, cooking, reading",
  values: "Honesty, kindness, growth mindset",
  profile_image: "/default.png",
  profile_image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-05-29T15:00:00Z",
} as Profile;

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    participants: [
      {
        id: 2,
        username: "alex_kumar",
        display_name: "Alex Kumar",
        name: "Alex Kumar",
        email: "alex@example.com",
        profile_image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        profile_picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        is_online: true,
        last_seen: "2026-05-29T17:20:00Z",
        age: 29,
      },
    ],
    last_message: {
      id: "msg-1",
      conversation: "conv-1",
      sender: {
        id: 2,
        username: "alex_kumar",
        email: "alex@example.com",
        is_online: true,
        last_seen: "2026-05-29T17:20:00Z",
      },
      content: "How was your weekend?",
      is_read: false,
      read_at: null,
      created_at: "2026-05-29T14:30:00Z",
    },
    unread_count: 0,
    created_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-05-29T14:30:00Z",
  },
  {
    id: "conv-2",
    participants: [
      {
        id: 3,
        username: "priya_sharma",
        display_name: "Priya Sharma",
        name: "Priya Sharma",
        email: "priya@example.com",
        profile_image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
        profile_picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
        is_online: false,
        last_seen: "2026-05-29T10:00:00Z",
        age: 27,
      },
    ],
    last_message: {
      id: "msg-2",
      conversation: "conv-2",
      sender: {
        id: 3,
        username: "priya_sharma",
        email: "priya@example.com",
        is_online: false,
        last_seen: "2026-05-29T10:00:00Z",
      },
      content: "That sounds amazing! 😊",
      is_read: false,
      read_at: null,
      created_at: "2026-05-29T13:00:00Z",
    },
    unread_count: 2,
    created_at: "2026-05-15T10:00:00Z",
    updated_at: "2026-05-29T13:00:00Z",
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-101",
    conversation: "conv-1",
    sender: {
      id: 2,
      username: "alex_kumar",
      email: "alex@example.com",
      is_online: true,
      last_seen: "2026-05-29T17:20:00Z",
    },
    content: "Hey! How are you?",
    is_read: true,
    read_at: "2026-05-29T12:05:00Z",
    created_at: "2026-05-29T12:00:00Z",
  },
  {
    id: "msg-102",
    conversation: "conv-1",
    sender: {
      id: 1,
      username: "jane_smith",
      email: "jane@example.com",
      is_online: true,
      last_seen: null,
    },
    content: "I'm doing great! Just had coffee. You?",
    is_read: true,
    read_at: "2026-05-29T12:10:00Z",
    created_at: "2026-05-29T12:05:00Z",
  },
  {
    id: "msg-103",
    conversation: "conv-1",
    sender: {
      id: 2,
      username: "alex_kumar",
      email: "alex@example.com",
      is_online: true,
      last_seen: "2026-05-29T17:20:00Z",
    },
    content: "How was your weekend?",
    is_read: false,
    read_at: null,
    created_at: "2026-05-29T14:30:00Z",
  },
];

// Mock API functions
export const getMyProfileMock = async (): Promise<Profile> => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
  return MOCK_PROFILE;
};

export const getConversationsMock = async (): Promise<PaginatedResponse<Conversation>> => {
  await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate network delay
  return {
    count: MOCK_CONVERSATIONS.length,
    next: null,
    previous: null,
    results: MOCK_CONVERSATIONS,
  };
};

export const getMessagesMock = async (conversationId: string): Promise<PaginatedResponse<Message>> => {
  await new Promise((resolve) => setTimeout(resolve, 400)); // Simulate network delay
  return {
    count: MOCK_MESSAGES.length,
    next: null,
    previous: null,
    results: MOCK_MESSAGES,
  };
};
