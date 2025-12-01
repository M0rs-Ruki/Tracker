"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useStore } from "@/store";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
  Sun,
  Moon,
  Loader2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IFolder } from "@/models/Folder";
import { IPage } from "@/models/Page";

interface SidebarProps {
  onPageSelect: (pageId: string) => void;
  onSettingsOpen: () => void;
  selectedPageId: string | null;
}

export function Sidebar({
  onPageSelect,
  onSettingsOpen,
  selectedPageId,
}: SidebarProps) {
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const {
    folders,
    pages,
    sidebarOpen,
    setSidebarOpen,
    fetchFolders,
    fetchPages,
    createFolder,
    updateFolder,
    deleteFolder,
    createPage,
    updatePage,
    deletePage,
    setSummaryDrawerOpen,
    isLoadingFolders,
    isLoadingPages,
    isCreatingFolder,
    isCreatingPage,
  } = useStore();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    type: "folder" | "page";
    id: string;
    name: string;
  } | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchFolders();
    fetchPages();
  }, [fetchFolders, fetchPages]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateFolder = async (parentFolderId?: string | null) => {
    try {
      await createFolder({ name: "New Folder", parentFolderId });
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleCreatePage = async (folderId?: string | null) => {
    try {
      const page = await createPage({ title: "Untitled Page", folderId });
      // Use the _id from the response, ensuring it's a string
      const pageId =
        typeof page._id === "object" ? page._id.toString() : String(page._id);
      onPageSelect(pageId);
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  const handleRename = (
    type: "folder" | "page",
    id: string,
    currentName: string
  ) => {
    setRenameTarget({ type, id, name: currentName });
    setNewName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !newName.trim()) return;

    if (renameTarget.type === "folder") {
      await updateFolder(renameTarget.id, { name: newName });
    } else {
      await updatePage(renameTarget.id, { title: newName });
    }

    setRenameDialogOpen(false);
    setRenameTarget(null);
    setNewName("");
  };

  const handleDelete = async (type: "folder" | "page", id: string) => {
    if (type === "folder") {
      await deleteFolder(id);
    } else {
      await deletePage(id);
    }
  };

  const handleDuplicate = async (page: IPage) => {
    await createPage({
      title: `${page.title} (Copy)`,
      folderId: page.folderId?.toString() || null,
      icon: page.icon,
    });
  };

  const toggleFolderExpanded = async (folder: IFolder) => {
    await updateFolder(folder._id.toString(), {
      isExpanded: !folder.isExpanded,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Handle reordering logic here
    // This is a simplified version - you'd want more complex logic for nested items
  };

  // Build tree structure
  const rootFolders = folders.filter((f) => !f.parentFolderId);
  const rootPages = pages.filter((p) => !p.folderId);

  const renderFolder = (folder: IFolder, level: number = 0) => {
    const childFolders = folders.filter(
      (f) => f.parentFolderId?.toString() === folder._id.toString()
    );
    const childPages = pages.filter(
      (p) => p.folderId?.toString() === folder._id.toString()
    );

    return (
      <FolderItem
        key={folder._id.toString()}
        folder={folder}
        level={level}
        childFolders={childFolders}
        childPages={childPages}
        selectedPageId={selectedPageId}
        onToggle={() => toggleFolderExpanded(folder)}
        onPageSelect={onPageSelect}
        onRename={(type, id, name) => handleRename(type, id, name)}
        onDelete={(type, id) => handleDelete(type, id)}
        onDuplicate={handleDuplicate}
        onCreateFolder={() => handleCreateFolder(folder._id.toString())}
        onCreatePage={() => handleCreatePage(folder._id.toString())}
        renderFolder={renderFolder}
      />
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-black dark:text-white">
                {session?.user?.name || "User"}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSettingsOpen}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => setSummaryDrawerOpen(true)}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          AI Summaries
        </Button>
      </div>

      {/* Create Buttons */}
      <div className="p-2 space-y-1 border-b border-neutral-200 dark:border-neutral-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => handleCreateFolder(null)}
          disabled={isCreatingFolder}
        >
          {isCreatingFolder ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Folder
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm"
          onClick={() => handleCreatePage(null)}
          disabled={isCreatingPage}
        >
          {isCreatingPage ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Page
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingFolders || isLoadingPages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[...rootFolders, ...rootPages].map((item) =>
                  item._id.toString()
                )}
                strategy={verticalListSortingStrategy}
              >
                {rootFolders.map((folder) => renderFolder(folder, 0))}
                {rootPages.map((page) => (
                  <PageItem
                    key={page._id.toString()}
                    page={page}
                    level={0}
                    isSelected={selectedPageId === page._id.toString()}
                    onSelect={() => onPageSelect(page._id.toString())}
                    onRename={() =>
                      handleRename("page", page._id.toString(), page.title)
                    }
                    onDelete={() => handleDelete("page", page._id.toString())}
                    onDuplicate={() => handleDuplicate(page)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {rootFolders.length === 0 && rootPages.length === 0 && (
              <div className="text-center text-neutral-500 dark:text-neutral-400 py-8 text-sm">
                No folders or pages yet.
                <br />
                Create your first page to get started!
              </div>
            )}
          </>
        )}
      </div>

      {/* Theme Toggle - Bottom of sidebar */}
      <ThemeToggle />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Rename {renameTarget?.type === "folder" ? "Folder" : "Page"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-left duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar
  return (
    <div
      className={cn(
        "h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-300 hidden md:block",
        sidebarOpen ? "w-72" : "w-0 overflow-hidden"
      )}
    >
      {sidebarContent}
    </div>
  );
}

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
      <Button
        variant="ghost"
        className="w-full justify-start text-sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </>
        ) : (
          <>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </>
        )}
      </Button>
    </div>
  );
}

// Folder Item Component
interface FolderItemProps {
  folder: IFolder;
  level: number;
  childFolders: IFolder[];
  childPages: IPage[];
  selectedPageId: string | null;
  onToggle: () => void;
  onPageSelect: (pageId: string) => void;
  onRename: (type: "folder" | "page", id: string, name: string) => void;
  onDelete: (type: "folder" | "page", id: string) => void;
  onDuplicate: (page: IPage) => void;
  onCreateFolder: () => void;
  onCreatePage: () => void;
  renderFolder: (folder: IFolder, level: number) => React.ReactNode;
}

function FolderItem({
  folder,
  level,
  childFolders,
  childPages,
  selectedPageId,
  onToggle,
  onPageSelect,
  onRename,
  onDelete,
  onDuplicate,
  onCreateFolder,
  onCreatePage,
  renderFolder,
}: FolderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder._id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer transition-colors",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          onClick={onToggle}
          className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
        >
          {folder.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0" {...listeners}>
          <FolderIcon className="h-4 w-4 text-neutral-500 shrink-0" />
          <span className="text-sm truncate text-black dark:text-white">
            {folder.name}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                onRename("folder", folder._id.toString(), folder.name)
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateFolder}>
              <FolderIcon className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreatePage}>
              <FileText className="mr-2 h-4 w-4" />
              New Page
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete("folder", folder._id.toString())}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {folder.isExpanded && (
        <div>
          {childFolders.map((childFolder) =>
            renderFolder(childFolder, level + 1)
          )}
          {childPages.map((page) => (
            <PageItem
              key={page._id.toString()}
              page={page}
              level={level + 1}
              isSelected={selectedPageId === page._id.toString()}
              onSelect={() => onPageSelect(page._id.toString())}
              onRename={() => onRename("page", page._id.toString(), page.title)}
              onDelete={() => onDelete("page", page._id.toString())}
              onDuplicate={() => onDuplicate(page)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Page Item Component
interface PageItemProps {
  page: IPage;
  level: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PageItem({
  page,
  level,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
}: PageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page._id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
          isSelected
            ? "bg-neutral-200 dark:bg-neutral-800"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-900",
          isDragging && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 12 + 28}px` }}
        onClick={handleClick}
      >
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hidden sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-neutral-400 opacity-0 group-hover:opacity-100" />
        </div>
        <span className="text-sm shrink-0">{page.icon}</span>
        <span className="text-sm truncate flex-1 text-black dark:text-white">
          {page.title}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
