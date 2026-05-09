import { useEffect, useMemo, useState, useRef } from "react";
import { Trash2, ChevronLeft, ChevronRight, Upload, Plus, X, Loader2, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuthStore } from "@/modules/auth/useAuthStore";
import type { TimetableActivity, Weekday } from "@/modules/contracts";
import { useTimetableStore } from "@/modules/timetable/useTimetableStore";

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const START_HOUR = 0; // 12 AM
const END_HOUR = 23; // 11 PM
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
const HOUR_HEIGHT = 80; // pixels

function getWeekDates(baseDate: Date) {
  const currentDay = baseDate.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(baseDate);
  monday.setDate(monday.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatHour(hour: number) {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  const ampm = hour > 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour;
  return `${h} ${ampm}`;
}

function parseTimeToHours(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

export default function TimetableScreen() {
  const token = useAuthStore((state) => state.accessToken);
  const activities = useTimetableStore((state) => state.activities);
  const status = useTimetableStore((state) => state.status);
  const errorMessage = useTimetableStore((state) => state.errorMessage);
  const loadActivities = useTimetableStore((state) => state.loadActivities);
  const createActivity = useTimetableStore((state) => state.createActivity);
  const updateActivity = useTimetableStore((state) => state.updateActivity);
  const deleteActivity = useTimetableStore((state) => state.deleteActivity);
  
  const [baseDate, setBaseDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<Weekday>("MONDAY");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploadingAI, setIsUploadingAI] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      void loadActivities(token);
    }
  }, [loadActivities, token]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  function handlePrevWeek() {
    const next = new Date(baseDate);
    next.setDate(next.getDate() - 7);
    setBaseDate(next);
  }

  function handleNextWeek() {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 7);
    setBaseDate(next);
  }

  function handleToday() {
    setBaseDate(new Date());
  }

  function openNewActivityModal(day?: Weekday, startH?: number) {
    setEditingActivityId(null);
    setName("");
    setDayOfWeek(day || "MONDAY");
    setStartTime(startH ? `${startH.toString().padStart(2, '0')}:00` : "08:00");
    setEndTime(startH ? `${(startH + 1).toString().padStart(2, '0')}:00` : "09:00");
    setLocalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(activity: TimetableActivity) {
    setEditingActivityId(activity.id);
    setName(activity.name);
    setDayOfWeek(activity.dayOfWeek);
    setStartTime(activity.startTime);
    setEndTime(activity.endTime);
    setLocalError(null);
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!token) return;
    if (!name.trim()) { setLocalError("Activity name is required."); return; }
    if (endTime <= startTime) { setLocalError("End time must be after start time."); return; }

    setLocalError(null);
    try {
      if (editingActivityId) {
        await updateActivity(token, editingActivityId, { name: name.trim(), dayOfWeek, startTime, endTime });
      } else {
        await createActivity(token, { name: name.trim(), dayOfWeek, startTime, endTime });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Save failed:", error);
    }
  }

  async function handleDelete() {
    if (!token || !editingActivityId) return;
    try {
      await deleteActivity(token, editingActivityId);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  const handleAIUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Stub for Phase 2 Backend AI Extraction
    setIsUploadingAI(true);
    setTimeout(() => {
      setIsUploadingAI(false);
      alert("AI Upload Simulation Complete! Backend integration pending.");
    }, 2500);
    e.target.value = '';
  };

  const monthYearStr = weekDates[0].toLocaleDateString('default', { month: 'long', year: 'numeric' });

  return (
    <AppShell title="Timetable">
      <div className="flex flex-col h-[calc(100vh-72px)] w-full max-w-[1600px] mx-auto overflow-hidden relative bg-white dark:bg-slate-900">
        
        {/* Toolbar */}
        <div className="flex flex-row items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-20">
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center min-w-[200px]">
              <h1 
                className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 group cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition" 
                onClick={() => {
                  try {
                    (document.getElementById('month-picker') as HTMLInputElement)?.showPicker?.();
                  } catch (e) {
                    // Fallback for browsers without showPicker
                    document.getElementById('month-picker')?.focus();
                  }
                }}
              >
                {monthYearStr}
                <ChevronDown size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
              </h1>
              <input 
                id="month-picker"
                type="month" 
                value={`${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split('-');
                    setBaseDate(new Date(Number(year), Number(month) - 1, 1));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-[200px] pointer-events-none"
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition"><ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" /></button>
              <button onClick={handleToday} className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-md transition">Today</button>
              <button onClick={handleNextWeek} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition"><ChevronRight size={20} className="text-slate-600 dark:text-slate-300" /></button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.docx,.png,.jpg,.jpeg" 
              onChange={handleAIUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAI}
              className="flex items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
            >
              {isUploadingAI ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Upload size={18} className="mr-2" />}
              {isUploadingAI ? "Extracting..." : "AI Auto-Fill"}
            </button>
            <button 
              onClick={() => openNewActivityModal()}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-sm"
            >
              <Plus size={18} className="mr-2" />
              Add Activity
            </button>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50 dark:bg-slate-950">
          <div className="min-w-[800px] flex-1 flex flex-col">
            
            {/* Days Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="w-16 border-r border-slate-200 dark:border-slate-800 shrink-0" /> {/* Time column spacer */}
              {WEEKDAYS.map((day, i) => {
                const date = weekDates[i];
                const isToday = new Date().toDateString() === date.toDateString();
                return (
                  <div key={day} className="flex-1 py-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{day.slice(0, 3)}</div>
                    <div className={`text-xl mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="flex relative flex-1">
              {/* Time Labels */}
              <div className="w-16 border-r border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 relative">
                {HOURS.map((hour) => (
                  <div key={hour} className="absolute w-full text-right pr-2 text-xs text-slate-400 font-medium transform -translate-y-1/2" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}>
                    {formatHour(hour)}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {WEEKDAYS.map((day) => {
                const dayActivities = activities.filter(a => a.dayOfWeek === day);
                return (
                  <div key={day} className="flex-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0 relative group" style={{ height: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT }}>
                    {/* Grid lines */}
                    {HOURS.map((hour) => (
                      <div 
                        key={hour} 
                        className="absolute w-full border-t border-slate-100 dark:border-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        onClick={() => openNewActivityModal(day, hour)}
                      />
                    ))}
                    
                    {/* Activity Blocks */}
                    {dayActivities.map(activity => {
                      const start = parseTimeToHours(activity.startTime);
                      const end = parseTimeToHours(activity.endTime);
                      const top = (start - START_HOUR) * HOUR_HEIGHT;
                      const height = (end - start) * HOUR_HEIGHT;
                      return (
                        <div
                          key={activity.id}
                          onClick={(e) => { e.stopPropagation(); openEditModal(activity); }}
                          className="absolute left-1 right-1 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-100/90 dark:bg-blue-900/80 p-2 overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all hover:brightness-105 z-10"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-100 leading-tight mb-1">{activity.name}</p>
                          <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">{activity.startTime} - {activity.endTime}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editingActivityId ? "Edit Activity" : "New Activity"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition">
                  <X size={18} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Activity Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Calculus 101" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Day</label>
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as Weekday)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    {WEEKDAYS.map(day => <option key={day} value={day}>{day.charAt(0) + day.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Start Time</label>
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">End Time</label>
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                {(localError || errorMessage) && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{localError || errorMessage}</p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  {editingActivityId && (
                    <button onClick={handleDelete} className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition">
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button onClick={handleSave} disabled={status === "saving"} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center">
                    {status === "saving" ? <Loader2 size={20} className="animate-spin mr-2" /> : null}
                    Save Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
