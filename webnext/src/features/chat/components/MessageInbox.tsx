"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";

// --- MOCK DATA ---
// Replace these with your actual data from your useChat/useMatches hooks
const MOCK_MATCHES = [
  { id: 101, name: "User 1", avatar: "https://i.pravatar.cc/150?u=101", isOnline: true, hasStory: true },
  { id: 102, name: "User 2", avatar: "https://i.pravatar.cc/150?u=102", isOnline: true, hasStory: true },
  { id: 103, name: "User 3", avatar: "https://i.pravatar.cc/150?u=103", isOnline: false, hasStory: true },
  { id: 104, name: "User 4", avatar: "https://i.pravatar.cc/150?u=104", isOnline: true, hasStory: false },
  { id: 105, name: "User 5", avatar: "https://i.pravatar.cc/150?u=105", isOnline: true, hasStory: false },
  { id: 106, name: "User 6", avatar: "https://i.pravatar.cc/150?u=106", isOnline: true, hasStory: false },
];

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    name: "Rohit Lamichhane",
    message: "Netflix and chill at 7?",
    avatar: "https://i.pravatar.cc/150?u=rohit",
    isOnline: true,
    unreadCount: 0,
  },
  {
    id: 2,
    name: "Joe Rogan",
    message: "Do you have a boyfriend? I kinda like you",
    avatar: "https://i.pravatar.cc/150?u=joe",
    isOnline: false,
    unreadCount: 1,
  },
  {
    id: 3,
    name: "Priya Tamang",
    message: "I did my dare. Now your turn, T or D?",
    avatar: "https://i.pravatar.cc/150?u=priya",
    isOnline: true,
    unreadCount: 2,
  },
];

export function MessageInbox() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenChat = (conversationId: number) => {
    router.push(`/chat/${conversationId}`);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-gradient-to-b from-slate-50 to-blue-50/50 dark:from-zinc-950 dark:to-zinc-900 font-sans">
      
      {/* HEADER */}
      <header className="flex items-center gap-2 px-4 py-6">
        <button 
          onClick={() => router.back()} 
          className="p-1 -ml-1 text-black dark:text-white"
        >
          <ChevronLeft className="w-8 h-8" strokeWidth={1.5} />
        </button>
        <h1 className="text-3xl font-medium text-black dark:text-white">
          Message inbox
        </h1>
      </header>

      {/* SEARCH BAR */}
      <div className="px-4 mb-6">
        <div className="relative flex items-center w-full h-12 bg-black/5 dark:bg-white/10 rounded-full px-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your matches"
            className="flex-1 bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-500 text-base"
          />
          <Search className="w-6 h-6 text-zinc-800 dark:text-zinc-300 ml-2" strokeWidth={1.5} />
        </div>
      </div>

      {/* MATCHES STRIP (Horizontal Scroll) */}
      <div className="px-4 mb-4">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {MOCK_MATCHES.map((match) => (
            <div key={match.id} className="relative flex-shrink-0 cursor-pointer">
              {/* Avatar Container with Optional Gradient Ring */}
              <div 
                className={`w-16 h-16 rounded-full p-[2px] ${
                  match.hasStory 
                    ? "bg-gradient-to-tr from-red-600 to-pink-500" 
                    : "bg-transparent"
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-950">
                  <img
                    src={match.avatar}
                    alt={match.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Online Indicator */}
              {match.isOnline && (
                <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
              )}
            </div>
          ))}
        </div>
        {/* Subtle Divider line under matches */}
        <div className="h-px w-full bg-black/10 dark:bg-white/10 mt-2" />
      </div>

      {/* CONVERSATION LIST */}
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="flex flex-col gap-6 pt-4 pb-8">
          {MOCK_CONVERSATIONS.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => handleOpenChat(chat.id)}
              className="flex items-center gap-4 cursor-pointer group"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-red-600 to-pink-500">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-950">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
                {chat.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-black dark:text-white mb-0.5">
                  {chat.name}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                  {chat.message}
                </p>
              </div>

              {/* Unread Badge */}
              {chat.unreadCount > 0 && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-200 dark:bg-cyan-800 text-cyan-950 dark:text-cyan-100 text-xs font-bold shrink-0">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}