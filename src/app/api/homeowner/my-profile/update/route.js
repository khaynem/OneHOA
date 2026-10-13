import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import User from "@/lib/server/models/users";
import Picture from "@/lib/server/models/pictures";
import { uploadImageDataUrl } from "@/lib/server/services/cloudinaryService";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const body = await request.json();

    const allowedFields = [
      "phone_number",
      "email",
      "job_title",
      "work_status",
      "household_members",
      "picture_id",
      "imageDataUrl",
      "fileName",
      "mimeType",
    ];
    const inputKeys = Object.keys(body || {});
    const invalidKeys = inputKeys.filter((k) => !allowedFields.includes(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { success: false, message: `Permission denied: Cannot edit read-only fields (${invalidKeys.join(", ")})` },
        { status: 400 }
      );
    }

    const {
      phone_number,
      email,
      job_title,
      work_status,
      household_members,
      picture_id,
      imageDataUrl,
      fileName,
      mimeType,
    } = body || {};

    const normalizedEmail = String(user.email || "").trim().toLowerCase();

    let record = await Record.findOne({
      $or: [{ user_id: user.id }, { email: normalizedEmail }],
    });

    if (!record && user.first_name && user.last_name) {
      record = await Record.findOne({
        first_name: { $regex: new RegExp(`^${user.first_name.trim()}$`, "i") },
        last_name: { $regex: new RegExp(`^${user.last_name.trim()}$`, "i") },
      });
    }

    // Fallback for testing/admin
    if (!record) {
      record = await Record.findOne({ archived: { $ne: true } });
    }

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Homeowner record not found." },
        { status: 404 }
      );
    }

    const updates = {};
    if (phone_number !== undefined) updates.phone_number = String(phone_number).trim();
    if (job_title !== undefined) updates.job_title = String(job_title).trim();
    if (work_status !== undefined) updates.work_status = String(work_status).trim();

    if (email !== undefined) {
      const normalizedNewEmail = String(email || "").trim().toLowerCase();
      if (!normalizedNewEmail) {
        return NextResponse.json(
          { success: false, message: "Email address cannot be empty." },
          { status: 400 }
        );
      }

      // Check for duplicate in User collection
      const duplicateUser = await User.findOne({
        email: normalizedNewEmail,
        _id: { $ne: user.id },
      });
      if (duplicateUser) {
        return NextResponse.json(
          { success: false, message: "Email address is already in use by another user." },
          { status: 409 }
        );
      }

      // Check for duplicate in Record collection
      const duplicateRecord = await Record.findOne({
        email: normalizedNewEmail,
        _id: { $ne: record._id },
      });
      if (duplicateRecord) {
        return NextResponse.json(
          { success: false, message: "Email address is already in use by another homeowner record." },
          { status: 409 }
        );
      }

      updates.email = normalizedNewEmail;
    }

    if (household_members !== undefined) {
      if (!Array.isArray(household_members)) {
        return NextResponse.json(
          { success: false, message: "Household members must be an array." },
          { status: 400 }
        );
      }
      // Normalize and sanitize household members list
      updates.household_members = household_members
        .map((m) => ({
          name: String(m.name || "").trim(),
          relationship: String(m.relationship || "").trim(),
        }))
        .filter((m) => m.name !== "");
    }

    // Handle profile picture update
    if (imageDataUrl) {
      if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
        return NextResponse.json(
          { success: false, message: "Invalid image format. Only image data URLs are allowed." },
          { status: 400 }
        );
      }
      const uploadResult = await uploadImageDataUrl(imageDataUrl);
      const picture = await Picture.create({
        filename: String(
          fileName || uploadResult.original_filename || uploadResult.public_id || "homeowner-photo"
        ),
        path: uploadResult.secure_url,
        mime_type: String(mimeType || uploadResult.resource_type || "image"),
        uploaded_at: new Date(),
      });
      updates["pictures._id"] = picture._id;
    } else if (picture_id) {
      updates["pictures._id"] = picture_id;
    }

    Object.assign(record, updates);
    await record.save();

    // If email was updated, update associated login user account too
    if (updates.email) {
      await User.updateOne({ _id: user.id }, { email: updates.email });
    }

    const populatedRecord = await Record.findById(record._id)
      .populate("address._id")
      .populate("pictures._id")
      .lean();

    return NextResponse.json(
      { success: true, message: "Profile updated successfully!", data: populatedRecord },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update profile details:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

