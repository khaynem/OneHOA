import mongoose from "mongoose";

const recordsSchema = new mongoose.Schema(
  {
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    middle_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone_number: {
      type: String,
      trim: true,
    },
    job_title: {
      type: String,
      trim: true,
    },
    work_address: {
      type: String,
      trim: true,
    },
    work_status: {
      type: String,
      trim: true,
    },
    entry_date: {
      type: Date,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archived_at: {
      type: Date,
    },
    occupant_status: {
      type: String,
      trim: true,
    },
    household_no: {
      type: Number,
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
    "address._id": {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    "pictures._id": {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Picture",
    },
    status: {
      type: [String],
      default: [],
    },
    generated_id: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "records",
  }
);

recordsSchema.index({ "address._id": 1 });

export default mongoose.models.Record || mongoose.model("Record", recordsSchema);
