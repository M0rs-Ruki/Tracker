"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/store";
import { useAutosave } from "@/hooks/use-autosave";
import { cn, formatCurrency, getDayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AutosaveIndicatorBadge } from "@/components/autosave-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  FileDown,
  Tag,
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
import { IPage, IDay, IEntry } from "@/models/Page";
import { exportApi } from "@/lib/api";

interface PageCanvasProps {
  page: IPage;
}

export function PageCanvas({ page }: PageCanvasProps) {
  const { updatePage, addEntry, updateEntry, deleteEntry, user } = useStore();

  const [title, setTitle] = useState(page.title);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(
    Object.fromEntries(page.days.map((d) => [d.dayIndex, true]))
  );
  const [editingEntry, setEditingEntry] = useState<{
    dayIndex: number;
    entry: IEntry | null;
  } | null>(null);
  const [entryForm, setEntryForm] = useState({
    title: "",
    amount: "",
    description: "",
    category: "",
    tags: "",
  });
  const [isExporting, setIsExporting] = useState(false);

  const currency = user?.settings?.currency || "₹";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Autosave title changes
  useAutosave({
    data: title,
    onSave: async (newTitle) => {
      if (newTitle !== page.title) {
        await updatePage(page._id.toString(), { title: newTitle });
      }
    },
    delay: 1000,
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayIndex]: !prev[dayIndex],
    }));
  };

  const openEntryDialog = (dayIndex: number, entry?: IEntry) => {
    if (entry) {
      setEntryForm({
        title: entry.title,
        amount: entry.amount.toString(),
        description: entry.description || "",
        category: entry.category || "",
        tags: entry.tags?.join(", ") || "",
      });
    } else {
      setEntryForm({
        title: "",
        amount: "",
        description: "",
        category: "",
        tags: "",
      });
    }
    setEditingEntry({ dayIndex, entry: entry || null });
  };

  const handleSaveEntry = async () => {
    if (!editingEntry || !entryForm.title || !entryForm.amount) return;

    const entryData = {
      title: entryForm.title,
      amount: parseFloat(entryForm.amount),
      description: entryForm.description,
      category: entryForm.category,
      tags: entryForm.tags
        ? entryForm.tags.split(",").map((t) => t.trim())
        : [],
    };

    if (editingEntry.entry) {
      await updateEntry(
        page._id.toString(),
        editingEntry.dayIndex,
        editingEntry.entry._id.toString(),
        entryData
      );
    } else {
      await addEntry(page._id.toString(), editingEntry.dayIndex, entryData);
    }

    setEditingEntry(null);
  };

  const handleDeleteEntry = async (dayIndex: number, entryId: string) => {
    await deleteEntry(page._id.toString(), dayIndex, entryId);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent, dayIndex: number) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const day = page.days.find((d) => d.dayIndex === dayIndex);
      if (!day) return;

      const oldIndex = day.entries.findIndex(
        (e) => e._id.toString() === active.id
      );
      const newIndex = day.entries.findIndex(
        (e) => e._id.toString() === over.id
      );

      const newEntries = arrayMove(day.entries, oldIndex, newIndex);
      const newDays = page.days.map((d) =>
        d.dayIndex === dayIndex ? { ...d, entries: newEntries } : d
      );

      await updatePage(page._id.toString(), { days: newDays });
    },
    [page, updatePage]
  );

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const blob = await exportApi.generatePdf(page._id.toString());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${page.title.replace(/[^a-z0-9]/gi, "_")}_export.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate totals
  const pageTotal = page.days.reduce(
    (total, day) =>
      total +
      day.entries.reduce((dayTotal, entry) => dayTotal + entry.amount, 0),
    0
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{page.icon}</span>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-3xl font-bold bg-transparent border-none outline-none w-full focus:ring-0 text-black dark:text-white placeholder:text-neutral-400"
                placeholder="Untitled Page"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span>
                Total:{" "}
                <strong className="text-black dark:text-white">
                  {formatCurrency(pageTotal, currency)}
                </strong>
              </span>
              <AutosaveIndicatorBadge />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>

        {/* Days */}
        <div className="space-y-4">
          {page.days.map((day) => (
            <DaySection
              key={day.dayIndex}
              day={day}
              currency={currency}
              isExpanded={expandedDays[day.dayIndex]}
              onToggle={() => toggleDay(day.dayIndex)}
              onAddEntry={() => openEntryDialog(day.dayIndex)}
              onEditEntry={(entry) => openEntryDialog(day.dayIndex, entry)}
              onDeleteEntry={(entryId) =>
                handleDeleteEntry(day.dayIndex, entryId)
              }
              onDragEnd={(event) => handleDragEnd(event, day.dayIndex)}
              sensors={sensors}
            />
          ))}
        </div>

        {/* Budget Summary */}
        {user?.settings?.monthlyBudget && (
          <div className="mt-8 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold mb-2">Budget Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Page Total
                </p>
                <p className="font-medium">
                  {formatCurrency(pageTotal, currency)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Monthly Budget
                </p>
                <p className="font-medium text-black dark:text-white">
                  {formatCurrency(user.settings.monthlyBudget, currency)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  Weekly Budget
                </p>
                <p className="font-medium text-black dark:text-white">
                  {formatCurrency(user.settings.monthlyBudget / 4, currency)}
                </p>
              </div>
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Status</p>
                <p
                  className={cn(
                    "font-medium",
                    pageTotal > user.settings.monthlyBudget / 4
                      ? "text-black dark:text-white"
                      : "text-black dark:text-white"
                  )}
                >
                  {pageTotal > user.settings.monthlyBudget / 4
                    ? "⚠️ Over Budget"
                    : "✓ On Track"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entry Dialog */}
      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.entry ? "Edit Entry" : "Add Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={entryForm.title}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, title: e.target.value })
                }
                placeholder="e.g., Groceries"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount *</label>
              <Input
                type="number"
                value={entryForm.amount}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, amount: e.target.value })
                }
                placeholder="e.g., 500"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={entryForm.description}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, description: e.target.value })
                }
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={entryForm.category}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, category: e.target.value })
                }
                placeholder="e.g., Food, Transport"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Tags (comma separated)
              </label>
              <Input
                value={entryForm.tags}
                onChange={(e) =>
                  setEntryForm({ ...entryForm, tags: e.target.value })
                }
                placeholder="e.g., essential, weekly"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEntry}
              disabled={!entryForm.title || !entryForm.amount}
            >
              {editingEntry?.entry ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Day Section Component
interface DaySectionProps {
  day: IDay;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  onAddEntry: () => void;
  onEditEntry: (entry: IEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function DaySection({
  day,
  currency,
  isExpanded,
  onToggle,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onDragEnd,
  sensors,
}: DaySectionProps) {
  const dayTotal = day.entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Day Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-900 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
          <h3 className="font-semibold text-black dark:text-white">
            {getDayName(day.dayIndex)}
          </h3>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            ({day.entries.length} entries)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium text-black dark:text-white">
            {formatCurrency(dayTotal, currency)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddEntry();
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Entries */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          {day.entries.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
              No entries yet. Click "Add" to create one.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={day.entries.map((e) => e._id.toString())}
                strategy={verticalListSortingStrategy}
              >
                {day.entries.map((entry) => (
                  <EntryCard
                    key={entry._id.toString()}
                    entry={entry}
                    currency={currency}
                    onEdit={() => onEditEntry(entry)}
                    onDelete={() => onDeleteEntry(entry._id.toString())}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

// Entry Card Component
interface EntryCardProps {
  entry: IEntry;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

function EntryCard({ entry, currency, onEdit, onDelete }: EntryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry._id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all",
        isDragging && "opacity-50"
      )}
    >
      <div
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium truncate text-black dark:text-white">
            {entry.title}
          </h4>
          <span className="font-semibold text-black dark:text-white">
            {formatCurrency(entry.amount, currency)}
          </span>
        </div>
        {(entry.description || entry.category) && (
          <div className="flex items-center gap-2 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {entry.category && (
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs">
                {entry.category}
              </span>
            )}
            {entry.description && (
              <span className="truncate">{entry.description}</span>
            )}
          </div>
        )}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Tag className="h-3 w-3 text-neutral-400" />
            {entry.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs text-neutral-600 dark:text-neutral-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
