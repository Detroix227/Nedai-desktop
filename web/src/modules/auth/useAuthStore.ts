import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ApiClientError, isApiClientError } from "@/lib/http";
import * as AuthApi from "@/modules/auth/auth.api";
import {
  buildProfileUpdatePayload,
  type UpdateProfilePayload,
} from "@/modules/auth/profile-payload";
import type { AuthState, AuthUser } from "@/modules/contracts";

type LoginCredentials = {
  email: string;
  password: string;
};

type SignupCredentials = LoginCredentials & {
  fullName: string;
  role: "STUDENT" | "LECTURER";
};

type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

type AuthStoreStatus = "idle" | "loading" | "authenticated" | "error";

type PersistedAuthStore = Pick<
  AuthStore,
  "user" | "accessToken" | "isAuthenticated"
>;

type AuthStore = AuthState & {
  bootstrapped: boolean;
  status: AuthStoreStatus;
  errorMessage: string | null;
  bootstrapSession: () => Promise<void>;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignupCredentials) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  refreshProfile: (token: string) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  googleSignIn: (idToken: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  markHydrated: () => void;
  markBootstrapped: () => void;
  setBootstrapStatus: (status: string) => void;
  setBootstrapProgress: (progress: number) => void;
};

function buildAuthErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function applyAuthenticatedSession(
  set: (
    partial:
      | Partial<AuthStore>
      | ((state: AuthStore) => Partial<AuthStore>),
  ) => void,
  session: {
    accessToken: string;
    user: AuthUser;
  },
) {
  set({
    user: session.user,
    accessToken: session.accessToken,
    isAuthenticated: true,
    status: "authenticated",
    errorMessage: null,
  });
}

function clearSession(
  set: (
    partial:
      | Partial<AuthStore>
      | ((state: AuthStore) => Partial<AuthStore>),
  ) => void,
) {
  set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    status: "idle",
    errorMessage: null,
  });
}

function getRequiredAccessToken(token: string | null) {
  if (!token) {
    throw new ApiClientError(401, "Unauthorized");
  }

  return token;
}

export const useAuthStore = create<AuthStore>()(
  persist<AuthStore, [], [], PersistedAuthStore>(
    (set, get) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      bootstrapped: false,
      bootstrapStatus: "initializing",
      bootstrapProgress: 0,
      isAuthenticated: false,
      status: "idle",
      errorMessage: null,
      bootstrapSession: async () => {
        // Listen for desktop bootstrap events
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          (window as any).electronAPI.onBootstrapStatus((status: string) => {
            console.log('[Desktop] Bootstrap status:', status);
            set({ bootstrapStatus: status });
            if (status === 'ready') {
              set({ bootstrapped: true });
            }
          });

          (window as any).electronAPI.onBootstrapProgress((progress: number) => {
            set({ bootstrapProgress: progress });
          });
        }

        const token = get().accessToken;

        if (!token) {
          clearSession(set);
          set({ bootstrapped: true });
          return;
        }

        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const response = await AuthApi.getCurrentUser(token);

          applyAuthenticatedSession(set, {
            accessToken: token,
            user: response.user,
          });
          set({ bootstrapped: true });
        } catch (error) {
          if (isApiClientError(error) && error.status === 401) {
            clearSession(set);
            set({ bootstrapped: true });
            return;
          }

          set({
            status: "error",
            errorMessage: buildAuthErrorMessage(error),
            bootstrapped: true,
          });
        }
      },
      signIn: async (credentials) => {
        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const response = await AuthApi.login({
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password,
          });

          applyAuthenticatedSession(set, response);
          set({ bootstrapped: true });
        } catch (error) {
          clearSession(set);
          set({
            status: "error",
            errorMessage: buildAuthErrorMessage(error),
            bootstrapped: true,
          });
          throw error;
        }
      },
      signUp: async (credentials) => {
        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const response = await AuthApi.register({
            fullName: credentials.fullName.trim(),
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password,
            role: credentials.role,
          });

          applyAuthenticatedSession(set, response);
          set({ bootstrapped: true });
        } catch (error) {
          clearSession(set);
          set({
            status: "error",
            errorMessage: buildAuthErrorMessage(error),
            bootstrapped: true,
          });
          throw error;
        }
      },
      updateProfile: async (payload) => {
        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const currentUser = get().user;
          const token = getRequiredAccessToken(get().accessToken);

          if (!currentUser) {
            throw new ApiClientError(401, "Unauthorized");
          }

          const response = await AuthApi.updateCurrentUser(
            token,
            buildProfileUpdatePayload(currentUser.role, payload),
          );

          set({
            user: response.user,
            isAuthenticated: true,
            status: "authenticated",
            errorMessage: null,
          });

          return response.user;
        } catch (error) {
          if (isApiClientError(error) && error.status === 401) {
            clearSession(set);
          } else {
            set({
              status: "error",
              errorMessage: buildAuthErrorMessage(error),
            });
          }

          throw error;
        }
      },
      refreshProfile: async (token) => {
        set({ status: "loading", errorMessage: null });

        try {
          const response = await AuthApi.getCurrentUser(token);
          applyAuthenticatedSession(set, {
            accessToken: token,
            user: response.user,
          });
        } catch (error) {
          set({
            status: "error",
            errorMessage: buildAuthErrorMessage(error),
          });
        }
      },
      changePassword: async (payload) => {
        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const token = getRequiredAccessToken(get().accessToken);

          await AuthApi.changeCurrentPassword(token, payload);

          set({
            status: "authenticated",
            errorMessage: null,
          });
        } catch (error) {
          if (isApiClientError(error) && error.status === 401) {
            clearSession(set);
          } else {
            set({
              status: "error",
              errorMessage: buildAuthErrorMessage(error),
            });
          }

          throw error;
        }
      },
      googleSignIn: async (idToken) => {
        set({
          status: "loading",
          errorMessage: null,
        });

        try {
          const response = await AuthApi.googleLogin(idToken);
          applyAuthenticatedSession(set, response);
          set({ bootstrapped: true });
        } catch (error) {
          clearSession(set);
          set({
            status: "error",
            errorMessage: buildAuthErrorMessage(error),
            bootstrapped: true,
          });
          throw error;
        }
      },
      logout: () => {
        clearSession(set);
      },
      clearError: () => set({ errorMessage: null, status: "idle" }),
      markHydrated: () => set({ hydrated: true }),
      markBootstrapped: () => set({ bootstrapped: true }),
      setBootstrapStatus: (status: string) => set({ bootstrapStatus: status }),
      setBootstrapProgress: (progress: number) => set({ bootstrapProgress: progress }),
    }),
    {
      name: "nedai-auth-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    useAuthStore.getState().logout();
  });
}
