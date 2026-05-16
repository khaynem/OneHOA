import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "settings",
  }
);

settingsSchema.index({ key: 1 }, { unique: true });

export default mongoose.models.Setting || mongoose.model("Setting", settingsSchema);
