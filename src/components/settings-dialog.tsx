"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, Key } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { user, updateUser, fetchUser } = useStore();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    monthlyBudget: "",
    currency: "₹",
    fixedExpenses: [] as Array<{ title: string; amount: number }>,
    preferredAIProvider: "openai",
  });

  const [aiKeys, setAiKeys] = useState({
    openai: "",
    google: "",
    anthropic: "",
    openrouter: "",
    huggingface: "",
  });

  const [newExpense, setNewExpense] = useState({ title: "", amount: "" });

  // Track if user data has been loaded into form (by user email to handle user changes)
  const initializedForUser = useRef<string | null>(null);

  // Use a ref to track the latest formData to avoid stale closures
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Initialize form data when dialog opens and user is available
  useEffect(() => {
    if (open && user && initializedForUser.current !== user.email) {
      setFormData({
        name: user.name || "",
        monthlyBudget: user.settings?.monthlyBudget?.toString() || "",
        currency: user.settings?.currency || "₹",
        fixedExpenses: user.settings?.fixedExpenses || [],
        preferredAIProvider: user.settings?.preferredAIProvider || "openai",
      });
      initializedForUser.current = user.email || null;
    }
  }, [open, user]);

  // Reset when dialog closes so it re-initializes next time
  useEffect(() => {
    if (!open) {
      initializedForUser.current = null;
    }
  }, [open]);

  const addFixedExpense = async () => {
    console.log("=== ADD CLICKED ===");
    console.log("newExpense:", newExpense);
    console.log(
      "formDataRef.current.fixedExpenses:",
      formDataRef.current.fixedExpenses
    );

    if (!newExpense.title.trim() || !newExpense.amount.trim()) {
      console.log("Validation failed - title or amount empty");
      return;
    }

    const newExp = {
      title: newExpense.title.trim(),
      amount: parseFloat(newExpense.amount),
    };
    console.log("New expense object:", newExp);

    // Get current expenses from ref (most up-to-date value)
    const currentExpenses = formDataRef.current.fixedExpenses;
    const updatedExpenses = [...currentExpenses, newExp];
    console.log("Updated expenses array:", updatedExpenses);

    // Update local state immediately
    setFormData((prev) => ({ ...prev, fixedExpenses: updatedExpenses }));
    setNewExpense({ title: "", amount: "" });

    // Save to database
    try {
      const payload = {
        settings: {
          monthlyBudget: parseFloat(formDataRef.current.monthlyBudget) || 0,
          currency: formDataRef.current.currency,
          fixedExpenses: updatedExpenses,
          preferredAIProvider: formDataRef.current.preferredAIProvider,
        },
      };
      console.log("Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("API response:", data);
      if (data.error) throw new Error(data.error);
      console.log("=== ADD SUCCESS ===");
    } catch (error) {
      console.error("Error saving expense:", error);
      // Revert on error
      setFormData((prev) => ({ ...prev, fixedExpenses: currentExpenses }));
    }
  };

  const removeFixedExpense = async (index: number) => {
    // Get current expenses from ref (most up-to-date value)
    const currentExpenses = formDataRef.current.fixedExpenses;
    const updatedExpenses = currentExpenses.filter((_, i) => i !== index);

    // Update local state immediately
    setFormData((prev) => ({ ...prev, fixedExpenses: updatedExpenses }));

    // Save to database
    try {
      const payload = {
        settings: {
          monthlyBudget: parseFloat(formDataRef.current.monthlyBudget) || 0,
          currency: formDataRef.current.currency,
          fixedExpenses: updatedExpenses,
          preferredAIProvider: formDataRef.current.preferredAIProvider,
        },
      };

      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
    } catch (error) {
      console.error("Error removing expense:", error);
      // Revert on error
      setFormData((prev) => ({ ...prev, fixedExpenses: currentExpenses }));
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      // Use ref to get the latest formData to avoid stale state
      const currentFormData = formDataRef.current;

      const payload = {
        name: currentFormData.name,
        settings: {
          monthlyBudget: parseFloat(currentFormData.monthlyBudget) || 0,
          currency: currentFormData.currency,
          fixedExpenses: currentFormData.fixedExpenses,
          preferredAIProvider: currentFormData.preferredAIProvider,
        },
      };

      await updateUser(payload);
      await fetchUser();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAIKeys = async () => {
    setIsSaving(true);
    try {
      const keysToSave: Record<string, string> = {};
      Object.entries(aiKeys).forEach(([provider, key]) => {
        if (key) keysToSave[provider] = key;
      });

      if (Object.keys(keysToSave).length > 0) {
        await updateUser({ aiKeys: keysToSave });
      }
      await fetchUser();
      setAiKeys({
        openai: "",
        google: "",
        anthropic: "",
        openrouter: "",
        huggingface: "",
      });
    } catch (error) {
      console.error("Error saving AI keys:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              General
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex-1">
              Budget
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">
              AI Keys
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="₹">₹ INR (Indian Rupee)</SelectItem>
                  <SelectItem value="$">$ USD (US Dollar)</SelectItem>
                  <SelectItem value="€">€ EUR (Euro)</SelectItem>
                  <SelectItem value="£">£ GBP (British Pound)</SelectItem>
                  <SelectItem value="¥">¥ JPY (Japanese Yen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="aiProvider">Preferred AI Provider</Label>
              <Select
                value={formData.preferredAIProvider}
                onValueChange={(value) =>
                  setFormData({ ...formData, preferredAIProvider: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="huggingface">HuggingFace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveGeneral} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="budget">Monthly Budget</Label>
              <Input
                id="budget"
                type="number"
                value={formData.monthlyBudget}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyBudget: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>Fixed Monthly Expenses</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newExpense.title}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, title: e.target.value })
                  }
                  placeholder="Expense name"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  placeholder="Amount"
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={
                    !newExpense.title.trim() || !newExpense.amount.trim()
                  }
                  onClick={addFixedExpense}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 mt-3 max-h-48 overflow-y-auto">
                {formData.fixedExpenses.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500 dark:text-neutral-400 text-sm">
                    No fixed expenses added yet
                  </div>
                ) : (
                  formData.fixedExpenses.map((expense, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900"
                    >
                      <span className="text-black dark:text-white">
                        {expense.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-black dark:text-white">
                          {formData.currency}
                          {expense.amount}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFixedExpense(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button onClick={handleSaveGeneral} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          {/* AI Keys Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Enter your API keys for AI providers. Keys are encrypted before
              storage.
            </p>

            <div>
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                value={aiKeys.openai}
                onChange={(e) =>
                  setAiKeys({ ...aiKeys, openai: e.target.value })
                }
                placeholder="sk-..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="google-key">Google Gemini API Key</Label>
              <Input
                id="google-key"
                type="password"
                value={aiKeys.google}
                onChange={(e) =>
                  setAiKeys({ ...aiKeys, google: e.target.value })
                }
                placeholder="AI..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input
                id="anthropic-key"
                type="password"
                value={aiKeys.anthropic}
                onChange={(e) =>
                  setAiKeys({ ...aiKeys, anthropic: e.target.value })
                }
                placeholder="sk-ant-..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
              <Input
                id="openrouter-key"
                type="password"
                value={aiKeys.openrouter}
                onChange={(e) =>
                  setAiKeys({ ...aiKeys, openrouter: e.target.value })
                }
                placeholder="sk-or-..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="huggingface-key">HuggingFace API Key</Label>
              <Input
                id="huggingface-key"
                type="password"
                value={aiKeys.huggingface}
                onChange={(e) =>
                  setAiKeys({ ...aiKeys, huggingface: e.target.value })
                }
                placeholder="hf_..."
                className="mt-1"
              />
            </div>

            <Button onClick={handleSaveAIKeys} disabled={isSaving}>
              <Key className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save API Keys"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
