"use client";

import React from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import Image from 'next/image';

// Types for our data
interface ChatMessage {
  id: number;
  name: string;
  lastMessage: string;
  avatarUrl: string;
  unreadCount?: number;
  isOnline: boolean;
  hasStory: boolean;
}

const chats: ChatMessage[] = [
  {
    id: 1,
    name: "Rohit Lamichhane",
    lastMessage: "Netflix and chill at 7?",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&q=80",
    isOnline: true,
    hasStory: true,
  },
  {
    id: 2,
    name: "Joe Rogan",
    lastMessage: "Do you have a boyfriend? I kinda like you",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80",
    unreadCount: 1,
    isOnline: false,
    hasStory: true,
  },
  {
    id: 3,
    name: "Priya Tamang",
    lastMessage: "I did my dare. Now your turn, T or D?",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    unreadCount: 2,
    isOnline: true,
    hasStory: true,
  },
  
];

export default function MessageInbox() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-blue-50 flex justify-center">
      <div className="w-full max-w-md bg-transparent flex flex-col">
        
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex items-center gap-4">
          <ChevronLeft className="w-8 h-8 cursor-pointer text-slate-800" strokeWidth={2.5} />
          <h1 className="text-3xl font-medium text-slate-900">Message inbox</h1>
        </header>

        {/* Search Bar */}
        <div className="px-6 py-4">
          <div className="relative flex items-center">
            <input 
              type="text"
              placeholder="Search your matches"
              className="w-full bg-slate-100/80 border-none rounded-full py-4 px-6 pr-14 text-slate-600 placeholder-slate-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <Search className="absolute right-5 w-7 h-7 text-slate-900" />
          </div>
        </div>

        {/* Horizontal Stories */}
        <div className="flex gap-4 overflow-x-auto px-6 py-4 no-scrollbar">
          {chats.concat(chats).map((user, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              <div className="p-[3px] rounded-full bg-gradient-to-tr from-red-500 via-purple-500 to-pink-500">
                <div className="bg-white p-[2px] rounded-full">
                  <div className="relative w-16 h-16">
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      sizes="64px"
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
              {user.isOnline && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
          ))}
        </div>

        <hr className="mx-6 border-slate-200 mt-2 mb-6" />

        {/* Chat List */}
        <div className="flex flex-col px-6 gap-6">
          {chats.map((chat) => (
            <div key={chat.id} className="flex items-center gap-4 cursor-pointer group">
              {/* Avatar with gradient border */}
              <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-red-500 via-purple-500 to-pink-500 flex-shrink-0">
                <div className="bg-white p-[1.5px] rounded-full">
                  <div className="relative w-16 h-16">
                    <Image
                      src={chat.avatarUrl}
                      alt={chat.name}
                      fill
                      sizes="64px"
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
                {chat.isOnline && (
                  <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {chat.name}
                </h3>
                <p className="text-slate-600 truncate text-[15px]">
                  {chat.lastMessage}
                </p>
              </div>

              {/* Unread Badge */}
              {chat.unreadCount && (
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-200 text-cyan-900 rounded-full flex items-center justify-center text-xs font-bold">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}