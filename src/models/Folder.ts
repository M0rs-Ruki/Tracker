import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFolder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  parentFolderId: mongoose.Types.ObjectId | null;
  order: number;
  isExpanded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    parentFolderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    order: { type: Number, default: 0 },
    isExpanded: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

FolderSchema.index({ userId: 1, parentFolderId: 1 });
FolderSchema.index({ userId: 1, order: 1 });

const Folder: Model<IFolder> =
  mongoose.models.Folder || mongoose.model<IFolder>("Folder", FolderSchema);

export default Folder;
