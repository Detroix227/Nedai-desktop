import { create } from "zustand";

import { isApiClientError } from "@/lib/http";
import type { TimetableActivity, Weekday } from "@/modules/contracts";
import * as TimetableApi from "@/modules/timetable/timetable.api";

type UpsertTimetableActivityPayload = {
  name: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
};

type TimetableStore = {
  status: "idle" | "loading" | "saving" | "error";
  errorMessage: string | null;
  activities: TimetableActivity[];
  loadActivities: (token: string) => Promise<void>;
  createActivity: (
    token: string,
    payload: UpsertTimetableActivityPayload,
  ) => Promise<void>;
  updateActivity: (
    token: string,
    activityId: string,
    payload: Partial<UpsertTimetableActivityPayload>,
  ) => Promise<void>;
  deleteActivity: (token: string, activityId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

function getErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export const useTimetableStore = create<TimetableStore>((set) => ({
  status: "idle",
  errorMessage: null,
  activities: [],
  loadActivities: async (token) => {
    set({ status: "loading", errorMessage: null });

    try {
      const response = await TimetableApi.listTimetableActivities(token);
      set({
        status: "idle",
        errorMessage: null,
        activities: response.activities,
      });
    } catch (error) {
      set({
        status: "error",
        errorMessage: getErrorMessage(error),
      });
    }
  },
  createActivity: async (token, payload) => {
    set({ status: "saving", errorMessage: null });

    try {
      const response = await TimetableApi.createTimetableActivity(token, payload);
      set((state) => ({
        status: "idle",
        errorMessage: null,
        activities: [...state.activities, response.activity].sort((left, right) =>
          `${left.dayOfWeek}-${left.startTime}`.localeCompare(
            `${right.dayOfWeek}-${right.startTime}`,
          ),
        ),
      }));
    } catch (error) {
      set({
        status: "error",
        errorMessage: getErrorMessage(error),
      });
      throw error;
    }
  },
  updateActivity: async (token, activityId, payload) => {
    set({ status: "saving", errorMessage: null });

    try {
      const response = await TimetableApi.updateTimetableActivity(
        token,
        activityId,
        payload,
      );
      set((state) => ({
        status: "idle",
        errorMessage: null,
        activities: state.activities
          .map((activity) =>
            activity.id === activityId ? response.activity : activity,
          )
          .sort((left, right) =>
            `${left.dayOfWeek}-${left.startTime}`.localeCompare(
              `${right.dayOfWeek}-${right.startTime}`,
            ),
          ),
      }));
    } catch (error) {
      set({
        status: "error",
        errorMessage: getErrorMessage(error),
      });
      throw error;
    }
  },
  deleteActivity: async (token, activityId) => {
    set({ status: "saving", errorMessage: null });

    try {
      await TimetableApi.deleteTimetableActivity(token, activityId);
      set((state) => ({
        status: "idle",
        errorMessage: null,
        activities: state.activities.filter((activity) => activity.id !== activityId),
      }));
    } catch (error) {
      set({
        status: "error",
        errorMessage: getErrorMessage(error),
      });
      throw error;
    }
  },
  clearError: () => set({ errorMessage: null, status: "idle" }),
  reset: () =>
    set({
      status: "idle",
      errorMessage: null,
      activities: [],
    }),
}));
