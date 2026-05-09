export type UpdateProfilePayload = Partial<{
  fullName: string;
  institution: string | null;
  matricNumber: string | null;
  studentAcademicLevel: string | null;
  dateOfBirth: string | null;
  lecturerHighestQualification: string | null;
  lecturerCurrentAcademicStage: string | null;
  age: number | null;
  maritalStatus: string | null;
  academicLevel: string | null;
  institutionalLevel: string | null;
  futureCareer: string | null;
}>;

type UserRole = "STUDENT" | "LECTURER" | "ADMIN";

export function buildProfileUpdatePayload(
  role: UserRole,
  payload: UpdateProfilePayload,
): UpdateProfilePayload {
  // Shared fields (all roles)
  const nextPayload: UpdateProfilePayload = {
    ...(payload.fullName !== undefined ? { fullName: payload.fullName.trim() } : {}),
    ...(payload.institution !== undefined ? { institution: payload.institution } : {}),
    ...(payload.age !== undefined ? { age: payload.age } : {}),
    ...(payload.maritalStatus !== undefined ? { maritalStatus: payload.maritalStatus } : {}),
    ...(payload.academicLevel !== undefined ? { academicLevel: payload.academicLevel } : {}),
    ...(payload.institutionalLevel !== undefined ? { institutionalLevel: payload.institutionalLevel } : {}),
    ...(payload.futureCareer !== undefined ? { futureCareer: payload.futureCareer } : {}),
  };

  if (role === "STUDENT") {
    return {
      ...nextPayload,
      ...(payload.matricNumber !== undefined ? { matricNumber: payload.matricNumber } : {}),
      ...(payload.studentAcademicLevel !== undefined ? { studentAcademicLevel: payload.studentAcademicLevel } : {}),
      ...(payload.dateOfBirth !== undefined ? { dateOfBirth: payload.dateOfBirth } : {}),
    };
  }

  return {
    ...nextPayload,
    ...(payload.lecturerHighestQualification !== undefined
      ? { lecturerHighestQualification: payload.lecturerHighestQualification }
      : {}),
    ...(payload.lecturerCurrentAcademicStage !== undefined
      ? { lecturerCurrentAcademicStage: payload.lecturerCurrentAcademicStage }
      : {}),
  };
}
