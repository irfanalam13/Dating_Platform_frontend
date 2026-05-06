import React from 'react';
import { 
  ChevronLeft, 
  Heart, 
  Star, 
  User, 
  Lightbulb 
} from 'lucide-react';
import Image from 'next/image';

interface NotificationItem {
  id: number;
  name: string;
  action: string;
  avatarUrl: string;
  type: 'image' | 'icon' | 'none';
  rightData?: string | any; 
}

const notifications: NotificationItem[] = [
  {
    id: 1,
    name: "Mr. Beast",
    action: "just liked your pic",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60",
    type: "image",
    rightData: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&auto=format&fit=crop&q=60",
  },
  {
    id: 2,
    name: "Bobby Khadka",
    action: "wants to match",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60",
    type: "icon",
    rightData: Heart,
  },
  {
    id: 3,
    name: "Tangy Mahato",
    action: "gave you SuperStar",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
    type: "icon",
    rightData: Star,
  },
  {
    id: 4,
    name: "Oli",
    action: "shares similar interests as you",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60",
    type: "icon",
    rightData: User,
  },
  {
    id: 5,
    name: "Rohit",
    action: "just added a quick snap",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60",
    type: "none",
  },
  {
    id: 6,
    name: "Samriddhi",
    action: "reacted to your post",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60",
    type: "icon",
    rightData: Lightbulb,
  },
];

export default function Notifications() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-sky-100/40 flex justify-center font-sans">
      <div className="w-full max-w-md p-5 flex flex-col gap-6">
        
        {/* Header Section */}
        <header className="flex items-center gap-4 mt-4">
          <button className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ChevronLeft size={28} className="text-black" strokeWidth={2.5} />
          </button>
          <h1 className="text-3xl font-normal text-slate-900">Notifications</h1>
        </header>

        {/* Notifications List */}
        <main className="flex flex-col gap-3.5">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="flex items-center justify-between bg-white border border-slate-100/80 p-3 rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              
              {/* Left Section (Avatar + Text) */}
              <div className="flex items-center gap-3.5 pl-2 max-w-[75%]">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={notification.avatarUrl}
                    alt={notification.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover w-full h-full border border-slate-200"
                  />
                </div>
                <div className="truncate">
                  <span className="font-semibold text-slate-900 text-[15px] mr-1.5">
                    {notification.name}
                  </span>
                  <span className="text-slate-600 text-[15px]">
                    {notification.action}
                  </span>
                </div>
              </div>

              {/* Right Section (Icons or Thumbnails) */}
              <div className="pr-2 flex-shrink-0 flex items-center justify-center w-10 h-10">
                {notification.type === 'image' && (
                  <div className="relative w-8 h-10 rounded-lg overflow-hidden border border-slate-100">
                    <Image
                      src={notification.rightData}
                      alt="Notification Post"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                )}
                {notification.type === 'icon' && (
                  (() => {
                    const IconComponent = notification.rightData;
                    let iconColor = "text-slate-700";
                    
                    if (notification.name === "Bobby Khadka") iconColor = "text-red-500 fill-red-500/20";
                    if (notification.name === "Tangy Mahato") iconColor = "text-yellow-500 fill-yellow-500/30";
                    if (notification.name === "Oli") iconColor = "text-indigo-500";
                    if (notification.name === "Samriddhi") iconColor = "text-yellow-600 fill-yellow-500/20";

                    return (
                      <div className={`p-2 rounded-full ${iconColor}`}>
                        <IconComponent size={20} />
                      </div>
                    );
                  })()
                )}
                {notification.type === 'none' && (
                  <div className="w-8 h-8" /> 
                )}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}