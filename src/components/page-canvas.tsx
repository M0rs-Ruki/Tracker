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

// Predefined categories for quick selection
const PREDEFINED_CATEGORIES = [
  "Food",
  "Travel",
  "Personal Care",
  "Groceries",
  "Transport",
  "Shopping",
  "Entertainment",
  "Health",
  "Bills",
  "Internet",
  "Rent",
  "Subscription",
  "Education",
  "Work",
  "Other",
];

interface PageCanvasProps {
  page: IPage;
}

export function PageCanvas({ page }: PageCanvasProps) {
  const { updatePage, addEntry, updateEntry, deleteEntry, user } = useStore();

  const [title, setTitle] = useState(page.title);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(
    Object.fromEntries(page.days.map((d) => [d.dayIndex, false]))
  );
  const [entryExpanded, setEntryExpanded] = useState<Record<string, boolean>>(
    {}
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
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const currency = user?.settings?.currency || "₹";

  // Filter categories based on input
  const filteredCategories = PREDEFINED_CATEGORIES.filter((cat) =>
    cat.toLowerCase().includes(entryForm.category.toLowerCase())
  );

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
      <div className="max-w-4xl mx-auto px-3 py-4 md:px-8 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 md:mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <span className="text-2xl md:text-4xl">{page.icon}</span>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-xl md:text-3xl font-bold bg-transparent border-none outline-none w-full focus:ring-0 text-black dark:text-white placeholder:text-neutral-400"
                placeholder="Untitled Page"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-neutral-500 dark:text-neutral-400">
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
            size="sm"
            className="w-full md:w-auto"
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
              entryExpanded={entryExpanded}
              setEntryExpanded={setEntryExpanded}
            />
          ))}
        </div>

        {/* Budget Summary */}
        {user?.settings?.monthlyBudget && (
          <div className="mt-6 md:mt-8 p-3 md:p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold mb-2 text-sm md:text-base">
              Budget Overview
            </h3>
            {(() => {
              // Calculate fixed expenses total
              const fixedExpensesTotal = (
                user.settings.fixedExpenses || []
              ).reduce((sum, expense) => sum + (expense.amount || 0), 0);
              // Real budget = Monthly Budget - Fixed Expenses
              const realBudgetMonthly =
                user.settings.monthlyBudget - fixedExpensesTotal;
              // Weekly budget based on real budget
              const weeklyBudget = realBudgetMonthly / 4;
              // Status check against weekly budget
              const isOverBudget = pageTotal > weeklyBudget;

              return (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 md:gap-4 text-xs md:text-sm">
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Page Total
                    </p>
                    <p className="font-medium text-black dark:text-white">
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
                      Fixed Expenses
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {formatCurrency(fixedExpensesTotal, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Real Monthly Budget
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {formatCurrency(realBudgetMonthly, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Weekly Budget
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {formatCurrency(weeklyBudget, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Status
                    </p>
                    <p className="font-medium text-black dark:text-white">
                      {isOverBudget ? "⚠️ Over Budget" : "✓ On Track"}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Entry Dialog */}
      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      >
        <DialogContent className="w-[95vw] sm:w-auto sm:max-w-lg p-4 sm:p-6">
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
            <div className="relative">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={entryForm.category}
                onChange={(e) => {
                  setEntryForm({ ...entryForm, category: e.target.value });
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowCategorySuggestions(false), 150);
                }}
                placeholder="e.g., Food, Transport"
                autoComplete="off"
              />
              {/* Category Suggestions Dropdown */}
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-lg">
                  {filteredCategories.map((category) => (
                    <div
                      key={category}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 text-black dark:text-white"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEntryForm({ ...entryForm, category });
                        setShowCategorySuggestions(false);
                      }}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
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
              {/* Quick Tag Chips */}
              <div className="mt-2 overflow-x-auto">
                <div className="flex gap-2 flex-nowrap sm:flex-wrap pr-1">
                  {[
                    "essential",
                    "daily",
                    "weekly",
                    "monthly",
                    "justfun",
                    "urgent",
                    "optional",
                  ].map((tag) => {
                    const tagsArr = entryForm.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0);
                    const isActive = tagsArr.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={cn(
                          "px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs rounded border shrink-0",
                          isActive
                            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                            : "bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white border-neutral-200 dark:border-neutral-800"
                        )}
                        onClick={() => {
                          let next = tagsArr;
                          if (isActive) {
                            next = next.filter((t) => t !== tag);
                          } else {
                            next = [...next, tag];
                          }
                          setEntryForm({
                            ...entryForm,
                            tags: next.join(", "),
                          });
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
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
  entryExpanded: Record<string, boolean>;
  setEntryExpanded: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
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
  entryExpanded,
  setEntryExpanded,
}: DaySectionProps) {
  const dayTotal = day.entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      {/* Day Header */}
      <div
        className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 bg-neutral-50 dark:bg-neutral-900 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500 shrink-0" />
          )}
          <h3 className="font-semibold text-sm md:text-base text-black dark:text-white truncate">
            {getDayName(day.dayIndex)}
          </h3>
          <span className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 hidden sm:inline">
            ({day.entries.length} entries)
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
            ({day.entries.length})
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="font-medium text-sm md:text-base text-black dark:text-white">
            {formatCurrency(dayTotal, currency)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 md:h-8 md:px-3"
            onClick={(e) => {
              e.stopPropagation();
              onAddEntry();
            }}
          >
            <Plus className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Entries */}
      {isExpanded && (
        <div className="p-2 md:p-4 space-y-2">
          {day.entries.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-neutral-500 dark:text-neutral-400 text-xs md:text-sm">
              No entries yet. Click &quot;Add&quot; to create one.
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
                    isExpanded={entryExpanded[entry._id.toString()] || false}
                    onToggleExpand={() =>
                      setEntryExpanded((prev) => ({
                        ...prev,
                        [entry._id.toString()]: !prev[entry._id.toString()],
                      }))
                    }
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
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function EntryCard({
  entry,
  currency,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: EntryCardProps) {
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

  const hasDetails = !!(
    entry.description ||
    (entry.tags && entry.tags.length > 0)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all overflow-hidden",
        isDragging && "opacity-50"
      )}
    >
      {/* Collapsed Row */}
      <div
        className={cn(
          "flex items-center gap-2 md:gap-3 p-2 md:p-3",
          hasDetails && "cursor-pointer"
        )}
        onClick={() => hasDetails && onToggleExpand()}
      >
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 hidden sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h4 className="font-medium truncate text-sm md:text-base text-black dark:text-white">
                {entry.title}
              </h4>

              {entry.category && (
                <span className="px-1.5 md:px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs shrink-0">
                  {entry.category}
                </span>
              )}
            </div>

            <span className="font-semibold text-sm md:text-base text-black dark:text-white shrink-0">
              {formatCurrency(entry.amount, currency)}
            </span>
          </div>
        </div>

        {hasDetails && (
          <button
            className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all duration-200"
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {/* Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:h-8 md:w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-56 max-w-[90vw]"
          >
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Details */}
      {isExpanded && hasDetails && (
        <div className="px-2 md:px-3 pb-2 md:pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          {entry.description && (
            <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {entry.description}
            </p>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
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
      )}
    </div>
  );
}
