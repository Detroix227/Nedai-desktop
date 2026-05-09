import { useState } from "react";
import {
  BookOpen,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  Check,
  X,
} from "lucide-react";

import { useChatStore } from "@/modules/chat/useChatStore";

type ChatItemProps = {
  id: string;
  title: string;
  isActive: boolean;
  isPinned?: boolean;
  onClick: () => void;
};

export function ChatItem({ id, title, isActive, isPinned, onClick }: ChatItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const renameChat = useChatStore((state) => state.renameChat);
  const pinChat = useChatStore((state) => state.pinChat);

  const handleRename = async () => {
    if (editTitle.trim() && editTitle.trim() !== title) {
      await renameChat(id, editTitle.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this chat?")) {
      await deleteChat(id);
    }
    setShowMenu(false);
  };

  const handlePin = async () => {
    await pinChat(id, !isPinned);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-full flex flex-row items-center rounded-xl p-3 bg-blue-50">
        <BookOpen size={18} className="text-blue-600" strokeWidth={2} />
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") handleCancelEdit();
          }}
          className="ml-3 flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
          autoFocus
        />
        <button
          onClick={handleRename}
          className="ml-2 p-1 rounded hover:bg-blue-100"
        >
          <Check size={16} className="text-green-600" />
        </button>
        <button
          onClick={handleCancelEdit}
          className="ml-1 p-1 rounded hover:bg-blue-100"
        >
          <X size={16} className="text-red-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-row items-center rounded-xl p-2 group transition ${
        isActive ? "bg-slate-100" : "hover:bg-slate-100/50"
      }`}
    >
      <button
        onClick={onClick}
        className="flex-1 flex flex-row items-center text-left overflow-hidden"
      >
        <BookOpen
          size={18}
          className={isActive ? "text-slate-700 shrink-0" : "text-slate-400 shrink-0"}
          strokeWidth={2}
        />
        <span
          className={`ml-3 flex-1 overflow-hidden truncate text-sm whitespace-nowrap ${
            isActive ? "font-medium text-slate-900" : "text-slate-600"
          }`}
        >
          {title || "Untitled Chat"}
        </span>
        {isPinned && (
          <Pin size={14} className="text-blue-500 shrink-0 ml-2" fill="currentColor" />
        )}
      </button>

      {/* Menu Button */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 ${
            showMenu ? "opacity-100 bg-slate-200" : "hover:bg-slate-200"
          } ${isActive ? "opacity-100" : ""}`}
        >
          <MoreVertical size={16} className="text-slate-500" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
              <button
                onClick={() => {
                  setIsEditing(true);
                }}
                className="w-full flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={14} className="mr-2" />
                Rename
              </button>
              <button
                onClick={handlePin}
                className="w-full flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Pin size={14} className="mr-2" />
                {isPinned ? "Unpin" : "Pin"}
              </button>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
