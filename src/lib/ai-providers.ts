import { decrypt } from "@/lib/encryption";
import { IUser } from "@/models/User";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider =
  | "openai"
  | "google"
  | "anthropic"
  | "openrouter"
  | "huggingface";

interface AIResponse {
  summary: string;
  insights: string[];
  recommendations: string[];
}

export async function generateAISummary(
  user: IUser,
  prompt: string,
  provider?: AIProvider
): Promise<AIResponse> {
  const selectedProvider =
    provider || user.settings.preferredAIProvider || "openai";

  // Get the appropriate API key
  const encryptedKey =
    user.aiKeys[selectedProvider as keyof typeof user.aiKeys];
  if (!encryptedKey) {
    throw new Error(`No API key found for provider: ${selectedProvider}`);
  }

  const apiKey = decrypt(encryptedKey);
  if (!apiKey) {
    throw new Error(
      `Failed to decrypt API key for provider: ${selectedProvider}`
    );
  }

  const systemPrompt = `You are a financial advisor AI assistant. Analyze spending data and provide:
1. A brief summary of spending patterns
2. Key insights (as a list)
3. Actionable recommendations to save money (as a list)

Respond in JSON format:
{
  "summary": "Brief summary here",
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  switch (selectedProvider) {
    case "openai":
      return generateWithOpenAI(apiKey, systemPrompt, prompt);
    case "google":
      return generateWithGoogle(apiKey, systemPrompt, prompt);
    case "anthropic":
      return generateWithAnthropic(apiKey, systemPrompt, prompt);
    case "openrouter":
      return generateWithOpenRouter(apiKey, systemPrompt, prompt);
    case "huggingface":
      return generateWithHuggingFace(apiKey, systemPrompt, prompt);
    default:
      throw new Error(`Unsupported AI provider: ${selectedProvider}`);
  }
}

async function generateWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  return JSON.parse(content);
}

async function generateWithGoogle(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(
    `${systemPrompt}\n\n${userPrompt}`
  );
  const response = result.response;
  const text = response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON response from Google AI");

  return JSON.parse(jsonMatch[0]);
}

async function generateWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text")
    throw new Error("No text response from Anthropic");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON response from Anthropic");

  return JSON.parse(jsonMatch[0]);
}

async function generateWithOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }
  );

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from OpenRouter");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON response from OpenRouter");

  return JSON.parse(jsonMatch[0]);
}

async function generateWithHuggingFace(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
        parameters: {
          max_new_tokens: 1024,
          return_full_text: false,
        },
      }),
    }
  );

  const data = await response.json();
  const content = Array.isArray(data)
    ? data[0]?.generated_text
    : data.generated_text;
  if (!content) throw new Error("No response from HuggingFace");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Return a default response if JSON parsing fails
    return {
      summary: content.slice(0, 500),
      insights: ["Unable to parse structured insights"],
      recommendations: ["Unable to parse structured recommendations"],
    };
  }

  return JSON.parse(jsonMatch[0]);
}
