import { ApiError } from "@/lib/api-error";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";
import { env } from "@/utils/env";
import { issueAccessToken } from "@/lib/auth-token";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/api/v1/app/schemas/auth.schema";
import {
  changePasswordSchema,
  updateCurrentUserSchema,
  type UpdateCurrentUserInput,
} from "@/api/v1/app/schemas/user.schema";
import { serializeUser } from "@/api/v1/serializers/user.serializer";
import { UserRole, type Prisma, type User } from "@prisma/client";
import { sendPasswordResetEmail } from "@/lib/email";

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class AuthServiceImpl {
  constructor(private readonly prismaClient: typeof prisma = prisma) {}

  public async register(payload: unknown) {
    const data = registerSchema.parse(payload);
    await this.assertEmailAvailable(data.email);

    const passwordHash = await Bun.password.hash(data.password);
    const user = await this.prismaClient.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role,
      },
    });

    const accessToken = await issueAccessToken(user);

    return {
      accessToken,
      user: serializeUser(user),
    };
  }

  public async login(payload: unknown) {
    const data = loginSchema.parse(payload);
    const user = await this.prismaClient.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await Bun.password.verify(
      data.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = await issueAccessToken(user);

    return {
      accessToken,
      user: serializeUser(user),
    };
  }

  public async getCurrentUser(userId: string) {
    const user = await this.getRequiredUser(userId);
    return serializeUser(user);
  }

  public async updateCurrentUser(userId: string, payload: unknown) {
    const currentUser = await this.getRequiredUser(userId);

    const data = updateCurrentUserSchema.parse(payload);
    const updateData = this.buildCurrentUserUpdateData(currentUser, data);
    const updatedUser = await this.prismaClient.user.update({
      where: {
        id: userId,
      },
      data: updateData,
    });

    return serializeUser(updatedUser);
  }

  public async changeCurrentPassword(userId: string, payload: unknown) {
    const user = await this.getRequiredUser(userId);
    const data = changePasswordSchema.parse(payload);

    const isPasswordValid = await Bun.password.verify(
      data.oldPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new ApiError(400, "Current password is incorrect");
    }

    const passwordHash = await Bun.password.hash(data.newPassword);

    await this.prismaClient.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    });
  }

  private async assertEmailAvailable(
    email: RegisterInput["email"] | LoginInput["email"],
  ) {
    const existingUser = await this.prismaClient.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ApiError(409, "An account with this email already exists");
    }
  }

  private buildCurrentUserUpdateData(
    user: User,
    data: UpdateCurrentUserInput,
  ) {
    if (user.role === UserRole.LECTURER && data.matricNumber != null) {
      throw new ApiError(400, "Matric number is only valid for students");
    }

    if (
      user.role === UserRole.STUDENT &&
      (data.lecturerHighestQualification != null ||
        data.lecturerCurrentAcademicStage != null)
    ) {
      throw new ApiError(400, "Lecturer profile fields are only valid for lecturers");
    }

    if (
      user.role === UserRole.LECTURER &&
      (data.studentAcademicLevel != null || data.dateOfBirth != null)
    ) {
      throw new ApiError(400, "Student profile fields are only valid for students");
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName;
    }

    if (data.institution !== undefined) {
      updateData.institution = normalizeNullableString(data.institution);
    }

    if (data.matricNumber !== undefined) {
      updateData.matricNumber = normalizeNullableString(data.matricNumber);
    }

    if (data.studentAcademicLevel !== undefined) {
      updateData.studentAcademicLevel = normalizeNullableString(
        data.studentAcademicLevel,
      );
    }

    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth
        ? new Date(`${data.dateOfBirth}T00:00:00.000Z`)
        : null;
    }

    if (data.lecturerHighestQualification !== undefined) {
      updateData.lecturerHighestQualification = normalizeNullableString(
        data.lecturerHighestQualification,
      );
    }

    if (data.lecturerCurrentAcademicStage !== undefined) {
      updateData.lecturerCurrentAcademicStage = normalizeNullableString(
        data.lecturerCurrentAcademicStage,
      );
    }

    if (data.age !== undefined) {
      (updateData as any).age = data.age;
    }

    if (data.maritalStatus !== undefined) {
      (updateData as any).maritalStatus = normalizeNullableString(data.maritalStatus);
    }

    if (data.academicLevel !== undefined) {
      (updateData as any).academicLevel = normalizeNullableString(data.academicLevel);
    }

    if (data.institutionalLevel !== undefined) {
      (updateData as any).institutionalLevel = normalizeNullableString(data.institutionalLevel);
    }

    if (data.futureCareer !== undefined) {
      (updateData as any).futureCareer = normalizeNullableString(data.futureCareer);
    }

    return updateData;
  }

  private async getRequiredUser(userId: string): Promise<User> {
    const user = await this.prismaClient.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    return user;
  }

  public async forgotPassword(email: string) {
    const user = await this.prismaClient.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Don't reveal if user exists - always return success
    if (!user) {
      return { message: "If an account exists, a reset link has been sent" };
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await this.prismaClient.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send reset email (non-blocking — if email fails we still return success to avoid leaking user existence)
    sendPasswordResetEmail({
      to: user.email,
      name: user.fullName || user.email.split("@")[0],
      resetToken,
    }).catch((err) => {
      console.error("[auth] Failed to send password reset email:", err);
    });

    return { message: "If an account exists, a reset link has been sent" };
  }

  public async resetPassword(token: string, newPassword: string) {
    const user = await this.prismaClient.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    const passwordHash = await Bun.password.hash(newPassword);

    await this.prismaClient.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: "Password reset successful" };
  }

  public async googleLogin(idToken: string) {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new ApiError(400, "Invalid Google token payload");
      }

      const { email, name, sub: googleId, picture } = payload;

      // Find user by email
      let user = await this.prismaClient.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Create new user if they don't exist
        // Note: For Google users, we use a random secure password hash since they'll use Google to log in
        const randomPassword = crypto.randomUUID();
        const passwordHash = await Bun.password.hash(randomPassword);

        user = await this.prismaClient.user.create({
          data: {
            email: email.toLowerCase(),
            fullName: name || email.split("@")[0],
            passwordHash,
            role: UserRole.STUDENT, // Default role
          },
        });
      }

      const accessToken = await issueAccessToken(user);

      return {
        accessToken,
        user: serializeUser(user),
      };
    } catch (error) {
      console.error("[AuthService] Google login error:", error);
      throw new ApiError(401, "Google authentication failed");
    }
  }
}

const AuthService = new AuthServiceImpl();

export default AuthService;
