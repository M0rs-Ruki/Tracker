import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEntry {
  _id: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  description?: string;
  category?: string;
  tags: string[];
  createdAt: Date;
}

export interface IDay {
  dayIndex: number;
  entries: IEntry[];
}

export interface IPage extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId | null;
  title: string;
  icon: string;
  days: IDay[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const EntrySchema = new Schema<IEntry>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: "" },
  category: { type: String, default: "" },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const DaySchema = new Schema<IDay>(
  {
    dayIndex: { type: Number, required: true },
    entries: { type: [EntrySchema], default: [] },
  },
  { _id: false }
);

const PageSchema = new Schema<IPage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    folderId: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
    title: { type: String, required: true, default: "Untitled Page" },
    icon: { type: String, default: "📄" },
    days: {
      type: [DaySchema],
      default: () =>
        Array.from({ length: 7 }, (_, i) => ({
          dayIndex: i + 1,
          entries: [],
        })),
    },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

PageSchema.index({ userId: 1, folderId: 1 });
PageSchema.index({ userId: 1, order: 1 });

const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>("Page", PageSchema);

export default Page;
