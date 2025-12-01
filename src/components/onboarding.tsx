"use client";

import { useState } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Wallet,
  Settings,
  Sparkles,
  CheckCircle,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, updateUser } = useStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    monthlyBudget: user?.settings?.monthlyBudget?.toString() || "",
    currency: user?.settings?.currency || "₹",
    fixedExpenses:
      user?.settings?.fixedExpenses ||
      ([] as Array<{ title: string; amount: number }>),
    preferredAIProvider: user?.settings?.preferredAIProvider || "openai",
    aiKey: "",
  });

  const [newExpense, setNewExpense] = useState({ title: "", amount: "" });

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const addFixedExpense = () => {
    if (newExpense.title && newExpense.amount) {
      setFormData({
        ...formData,
        fixedExpenses: [
          ...formData.fixedExpenses,
          { title: newExpense.title, amount: parseFloat(newExpense.amount) },
        ],
      });
      setNewExpense({ title: "", amount: "" });
    }
  };

  const removeFixedExpense = (index: number) => {
    setFormData({
      ...formData,
      fixedExpenses: formData.fixedExpenses.filter((_, i) => i !== index),
    });
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        settings: {
          monthlyBudget: parseFloat(formData.monthlyBudget) || 0,
          currency: formData.currency,
          fixedExpenses: formData.fixedExpenses,
          preferredAIProvider: formData.preferredAIProvider,
        },
        onboardingCompleted: true,
      };

      // Only include AI key if provided
      if (formData.aiKey) {
        updateData.aiKeys = {
          [formData.preferredAIProvider]: formData.aiKey,
        };
      }

      await updateUser(updateData);
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-neutral-100 dark:bg-neutral-900">
          <div
            className="h-full bg-black dark:bg-white transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="h-10 w-10 text-white dark:text-black" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-black dark:text-white">
                Welcome to Finance Tracker! 💰
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Let&apos;s set up your personal finance workspace. It only takes
                a minute!
              </p>
              <Button onClick={handleNext} className="w-full" size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Name */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                What&apos;s your name?
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                We&apos;ll use this to personalize your experience.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter your name"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-black dark:text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                Set your monthly budget
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                This helps us track your spending and alert you when you&apos;re
                approaching your limit.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
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
                  <Label htmlFor="budget">Monthly Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.monthlyBudget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyBudget: e.target.value,
                      })
                    }
                    placeholder="e.g., 50000"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Fixed Expenses */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                Fixed monthly expenses
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Add your recurring expenses like rent, utilities, subscriptions,
                etc.
              </p>
              <div className="space-y-4">
                {/* Add new expense */}
                <div className="flex gap-2">
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
                    variant="outline"
                    size="icon"
                    onClick={addFixedExpense}
                    disabled={!newExpense.title || !newExpense.amount}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expense list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.fixedExpenses.map((expense, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                    >
                      <span className="text-black dark:text-white">
                        {expense.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
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
                  ))}
                  {formData.fixedExpenses.length === 0 && (
                    <p className="text-center text-neutral-500 py-4 text-sm">
                      No fixed expenses added yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: AI Setup */}
          {step === 5 && (
            <div>
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-black dark:text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-black dark:text-white">
                Enable AI Summaries (Optional)
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Get AI-powered insights about your spending. You can skip this
                and add it later.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select
                    value={formData.preferredAIProvider}
                    onValueChange={(value) =>
                      setFormData({ ...formData, preferredAIProvider: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        OpenAI (GPT-4o-mini)
                      </SelectItem>
                      <SelectItem value="google">Google (Gemini)</SelectItem>
                      <SelectItem value="anthropic">
                        Anthropic (Claude)
                      </SelectItem>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="huggingface">HuggingFace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key (Optional)</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.aiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, aiKey: e.target.value })
                    }
                    placeholder="Enter your API key"
                    className="mt-2"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Your API key is encrypted and stored securely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step > 1 && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              {step < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Saving..."
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="px-8 pb-6 flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i + 1 === step
                  ? "bg-black dark:bg-white"
                  : i + 1 < step
                  ? "bg-neutral-400"
                  : "bg-neutral-200 dark:bg-neutral-700"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
