import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAISummary extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  type: "daily" | "weekly";
  summary: string;
  totalSpent: number;
  insights: string[];
  recommendations: string[];
  createdAt: Date;
}

const AISummarySchema = new Schema<IAISummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ["daily", "weekly"], required: true },
    summary: { type: String, required: true },
    totalSpent: { type: Number, default: 0 },
    insights: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

AISummarySchema.index({ userId: 1, date: 1, type: 1 });

const AISummary: Model<IAISummary> =
  mongoose.models.AISummary ||
  mongoose.model<IAISummary>("AISummary", AISummarySchema);

export default AISummary;
