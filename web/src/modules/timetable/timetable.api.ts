import { request } from "@/lib/http";
import type {
  ServerCreateTimetableActivityResponse,
  ServerListTimetableActivitiesResponse,
  ServerUpdateTimetableActivityResponse,
  Weekday,
} from "@/modules/contracts";

type UpsertTimetableActivityPayload = {
  name: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
};

export function listTimetableActivities(token: string) {
  return request<ServerListTimetableActivitiesResponse>(
    "/timetable/activities",
    {
      token,
    },
  );
}

export function createTimetableActivity(
  token: string,
  payload: UpsertTimetableActivityPayload,
) {
  return request<ServerCreateTimetableActivityResponse>(
    "/timetable/activities",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export function updateTimetableActivity(
  token: string,
  activityId: string,
  payload: Partial<UpsertTimetableActivityPayload>,
) {
  return request<ServerUpdateTimetableActivityResponse>(
    `/timetable/activities/${activityId}`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

export function deleteTimetableActivity(token: string, activityId: string) {
  return request<Record<string, never>>(`/timetable/activities/${activityId}`, {
    method: "DELETE",
    token,
  });
}
