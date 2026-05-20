import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    phase: {
      type: Number,
      required: true,
    },
    block: {
      type: Number,
      required: true,
    },
    lot: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "addresses",
  }
);

export default mongoose.models.Address || mongoose.model("Address", addressSchema);
