import mongoose from "mongoose";

const EmailVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code_hash: {
      type: String,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verified_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EmailVerification ||
  mongoose.model("EmailVerification", EmailVerificationSchema);
