import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    middle_name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phone_number: {
      type: String,
      trim: true,
      default: "",
    },
    job_title: {
      type: String,
      trim: true,
      default: "",
    },
    work_status: {
      type: String,
      trim: true,
      default: "",
    },
    entry_date: {
      type: Date,
    },
    occupant_status: {
      type: String,
      trim: true,
      default: "",
    },
    household_members: {
      type: [
        {
          name: { type: String, trim: true },
          relationship: { type: String, trim: true }
        }
      ],
      default: []
    },
    phase: {
      type: Number,
    },
    block: {
      type: Number,
    },
    lot: {
      type: Number,
    },
    picture_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Picture",
    },
    valid_id_picture_ids: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Picture",
        }
      ],
      default: [],
      validate: [v => v.length > 0 && v.length <= 4, 'Must have at least 1 and up to 4 valid ID pictures']
    },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
    },
    decline_reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "pending_registrations",
  }
);

export default mongoose.models.PendingRegistration || mongoose.model("PendingRegistration", pendingRegistrationSchema);
