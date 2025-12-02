import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFixedExpense {
  title: string;
  amount: number;
}

export interface IAIKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
  openrouter?: string;
  huggingface?: string;
}

export interface ISettings {
  monthlyBudget: number;
  fixedExpenses: IFixedExpense[];
  preferredAIProvider?: string;
  currency?: string;
}

export interface IEmailSettings {
  weeklyReportsEnabled: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  aiKeys: IAIKeys;
  settings: ISettings;
  emailSettings: IEmailSettings;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FixedExpenseSchema = new Schema<IFixedExpense>({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
});

const AIKeysSchema = new Schema<IAIKeys>(
  {
    openai: { type: String },
    google: { type: String },
    anthropic: { type: String },
    openrouter: { type: String },
    huggingface: { type: String },
  },
  { _id: false }
);

const SettingsSchema = new Schema<ISettings>(
  {
    monthlyBudget: { type: Number, default: 0 },
    fixedExpenses: { type: [FixedExpenseSchema], default: [] },
    preferredAIProvider: { type: String, default: "openai" },
    currency: { type: String, default: "₹" },
  },
  { _id: false }
);

const EmailSettingsSchema = new Schema<IEmailSettings>(
  {
    weeklyReportsEnabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    aiKeys: { type: AIKeysSchema, default: {} },
    settings: { type: SettingsSchema, default: {} },
    emailSettings: { type: EmailSettingsSchema, default: {} },
    onboardingCompleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
