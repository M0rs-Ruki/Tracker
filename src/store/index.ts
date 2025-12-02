import { create } from "zustand";
import { IFolder } from "@/models/Folder";
import { IPage, IEntry } from "@/models/Page";
import { IUser } from "@/models/User";
import { IAISummary } from "@/models/AISummary";
import { folderApi, pageApi, userApi, aiApi } from "@/lib/api";

interface AppState {
  // User
  user: IUser | null;
  isLoadingUser: boolean;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<IUser>) => Promise<void>;

  // Folders
  folders: IFolder[];
  isLoadingFolders: boolean;
  isCreatingFolder: boolean;
  fetchFolders: () => Promise<void>;
  createFolder: (data: {
    name?: string;
    parentFolderId?: string | null;
  }) => Promise<IFolder>;
  updateFolder: (id: string, data: Partial<IFolder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Pages
  pages: IPage[];
  currentPage: IPage | null;
  isLoadingPages: boolean;
  isLoadingCurrentPage: boolean;
  isCreatingPage: boolean;
  fetchPages: () => Promise<void>;
  fetchPage: (id: string) => Promise<void>;
  createPage: (data: {
    title?: string;
    folderId: string; // Required - pages must be in a folder
    icon?: string;
  }) => Promise<IPage>;
  updatePage: (id: string, data: Partial<IPage>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  setCurrentPage: (page: IPage | null) => void;

  // Entries
  addEntry: (
    pageId: string,
    dayIndex: number,
    entry: Partial<IEntry>
  ) => Promise<void>;
  updateEntry: (
    pageId: string,
    dayIndex: number,
    entryId: string,
    data: Partial<IEntry>
  ) => Promise<void>;
  deleteEntry: (
    pageId: string,
    dayIndex: number,
    entryId: string
  ) => Promise<void>;

  // AI Summaries
  dailySummaries: IAISummary[];
  weeklySummaries: IAISummary[];
  isGeneratingSummary: boolean;
  generateDailySummary: (provider?: string) => Promise<IAISummary>;
  generateWeeklySummary: (provider?: string) => Promise<IAISummary>;
  fetchDailySummaries: (limit?: number) => Promise<void>;
  fetchWeeklySummaries: (limit?: number) => Promise<void>;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  summaryDrawerOpen: boolean;
  setSummaryDrawerOpen: (open: boolean) => void;

  // Autosave
  isSaving: boolean;
  lastSaved: Date | null;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (date: Date | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // User
  user: null,
  isLoadingUser: false,
  fetchUser: async () => {
    set({ isLoadingUser: true });
    try {
      const response = await userApi.get();
      set({ user: response.data });
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      set({ isLoadingUser: false });
    }
  },
  updateUser: async (data) => {
    try {
      const response = await userApi.update(data);
      set({ user: response.data });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  // Folders
  folders: [],
  isLoadingFolders: false,
  isCreatingFolder: false,
  fetchFolders: async () => {
    set({ isLoadingFolders: true });
    try {
      const response = await folderApi.getAll();
      set({ folders: response.data });
    } catch (error) {
      console.error("Error fetching folders:", error);
    } finally {
      set({ isLoadingFolders: false });
    }
  },
  createFolder: async (data) => {
    set({ isCreatingFolder: true });
    try {
      const response = await folderApi.create(data);
      set((state) => ({ folders: [...state.folders, response.data] }));
      return response.data;
    } finally {
      set({ isCreatingFolder: false });
    }
  },
  updateFolder: async (id, data) => {
    const response = await folderApi.update(id, data);
    set((state) => ({
      folders: state.folders.map((f) =>
        f._id.toString() === id ? response.data : f
      ),
    }));
  },
  deleteFolder: async (id) => {
    await folderApi.delete(id);
    set((state) => ({
      folders: state.folders.filter((f) => f._id.toString() !== id),
      pages: state.pages.filter((p) => p.folderId?.toString() !== id),
    }));
  },

  // Pages
  pages: [],
  currentPage: null,
  isLoadingPages: false,
  isLoadingCurrentPage: false,
  isCreatingPage: false,
  fetchPages: async () => {
    set({ isLoadingPages: true });
    try {
      const response = await pageApi.getAll();
      set({ pages: response.data });
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      set({ isLoadingPages: false });
    }
  },
  fetchPage: async (id) => {
    set({ isLoadingCurrentPage: true });
    try {
      const response = await pageApi.get(id);
      set({ currentPage: response.data });
    } catch (error) {
      console.error("Error fetching page:", error);
    } finally {
      set({ isLoadingCurrentPage: false });
    }
  },
  createPage: async (data) => {
    set({ isCreatingPage: true });
    try {
      const response = await pageApi.create(data);
      const newPage = response.data;
      set((state) => ({ pages: [...state.pages, newPage] }));
      return newPage;
    } finally {
      set({ isCreatingPage: false });
    }
  },
  updatePage: async (id, data) => {
    set({ isSaving: true });
    try {
      const response = await pageApi.update(id, data);
      set((state) => ({
        pages: state.pages.map((p) =>
          p._id.toString() === id ? response.data : p
        ),
        currentPage:
          state.currentPage?._id.toString() === id
            ? response.data
            : state.currentPage,
        lastSaved: new Date(),
      }));
    } finally {
      set({ isSaving: false });
    }
  },
  deletePage: async (id) => {
    await pageApi.delete(id);
    set((state) => ({
      pages: state.pages.filter((p) => p._id.toString() !== id),
      currentPage:
        state.currentPage?._id.toString() === id ? null : state.currentPage,
    }));
  },
  setCurrentPage: (page) => set({ currentPage: page }),

  // Entries
  addEntry: async (pageId, dayIndex, entry) => {
    const response = await (
      await import("@/lib/api")
    ).entryApi.create(pageId, dayIndex, {
      title: entry.title || "New Entry",
      amount: entry.amount || 0,
      description: entry.description,
      category: entry.category,
      tags: entry.tags,
    });
    set((state) => ({
      currentPage: response.data.page,
      pages: state.pages.map((p) =>
        p._id.toString() === pageId ? response.data.page : p
      ),
    }));
  },
  updateEntry: async (pageId, dayIndex, entryId, data) => {
    set({ isSaving: true });
    try {
      const response = await (
        await import("@/lib/api")
      ).entryApi.update(pageId, dayIndex, entryId, data);
      set((state) => ({
        currentPage: response.data,
        pages: state.pages.map((p) =>
          p._id.toString() === pageId ? response.data : p
        ),
        lastSaved: new Date(),
      }));
    } finally {
      set({ isSaving: false });
    }
  },
  deleteEntry: async (pageId, dayIndex, entryId) => {
    const response = await (
      await import("@/lib/api")
    ).entryApi.delete(pageId, dayIndex, entryId);
    set((state) => ({
      currentPage: response.data,
      pages: state.pages.map((p) =>
        p._id.toString() === pageId ? response.data : p
      ),
    }));
  },

  // AI Summaries
  dailySummaries: [],
  weeklySummaries: [],
  isGeneratingSummary: false,
  generateDailySummary: async (provider) => {
    set({ isGeneratingSummary: true });
    try {
      const currentPage = get().currentPage;
      if (!currentPage) {
        throw new Error("No page selected");
      }

      // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
      const today = new Date();
      const dayIndex = today.getDay();

      const response = await aiApi.generateDailySummary(
        currentPage._id.toString(),
        dayIndex,
        provider
      );
      set((state) => ({
        dailySummaries: [
          response.data,
          ...state.dailySummaries.filter((s) => s.date !== response.data.date),
        ],
      }));
      return response.data;
    } finally {
      set({ isGeneratingSummary: false });
    }
  },
  generateWeeklySummary: async (provider) => {
    set({ isGeneratingSummary: true });
    try {
      const response = await aiApi.generateWeeklySummary(provider);
      set((state) => ({
        weeklySummaries: [
          response.data,
          ...state.weeklySummaries.filter((s) => s.date !== response.data.date),
        ],
      }));
      return response.data;
    } finally {
      set({ isGeneratingSummary: false });
    }
  },
  fetchDailySummaries: async (limit) => {
    try {
      const response = await aiApi.getDailySummaries(limit);
      set({ dailySummaries: response.data });
    } catch (error) {
      console.error("Error fetching daily summaries:", error);
    }
  },
  fetchWeeklySummaries: async (limit) => {
    try {
      const response = await aiApi.getWeeklySummaries(limit);
      set({ weeklySummaries: response.data });
    } catch (error) {
      console.error("Error fetching weekly summaries:", error);
    }
  },

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  summaryDrawerOpen: false,
  setSummaryDrawerOpen: (open) => set({ summaryDrawerOpen: open }),

  // Autosave
  isSaving: false,
  lastSaved: null,
  setIsSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSaved: date }),
}));
