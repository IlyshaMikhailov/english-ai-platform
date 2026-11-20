import { create } from "zustand";
import { api, getStoredToken, setStoredToken } from "../services/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getStoredToken(),
  isInitialized: false,
  isLoading: false,
  error: null,
  onboardingForceOpen: false,

  initialize: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, token: null, isInitialized: true });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const user = await api.fetchMe();
      set({ user, token, isInitialized: true, isLoading: false });
    } catch {
      setStoredToken(null);
      set({ user: null, token: null, isInitialized: true, isLoading: false });
    }
  },

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(identifier, password);
      setStoredToken(data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isInitialized: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register(payload);
      setStoredToken(data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isInitialized: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  loginDemo: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginDemo();
      setStoredToken(data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isInitialized: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  loginAdminDemo: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginAdminDemo();
      setStoredToken(data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isInitialized: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateProfile: async (payload) => {
    const updatedUser = await api.updateMe(payload);
    set({ user: updatedUser });
    return updatedUser;
  },

  completeOnboarding: async () => {
    const data = await api.completeOnboarding();
    set({ user: data.user, onboardingForceOpen: false });
    return data.user;
  },

  openOnboardingTour: () => set({ onboardingForceOpen: true }),
  closeOnboardingTour: () => set({ onboardingForceOpen: false }),

  logout: () => {
    setStoredToken(null);
    set({
      user: null,
      token: null,
      error: null,
      onboardingForceOpen: false,
      isInitialized: true,
    });
  },
}));
