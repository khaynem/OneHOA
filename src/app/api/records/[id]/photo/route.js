import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Record from "@/lib/server/models/records";
import Picture from "@/lib/server/models/pictures";
import { uploadImageDataUrl } from "@/lib/server/services/cloudinaryService";
import { requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { formatHomeownerName, isValidObjectId, withGeneratedId } from "@/lib/server/recordsHelpers";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  let user;
  try {
    user = await requireAuth();
    await connectToDatabase();

    const { id } = params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid record ID." }, { status: 400 });
    }

    const body = await request.json();
    const { imageDataUrl, fileName, mimeType } = body || {};

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { success: false, message: "imageDataUrl is required." },
        { status: 400 }
      );
    }

    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, message: "Only image uploads are allowed." },
        { status: 400 }
      );
    }

    const existingRecord = await Record.findById(id);
    if (!existingRecord) {
      return NextResponse.json({ success: false, message: "Record not found." }, { status: 404 });
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

    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      { "pictures._id": picture._id },
      { new: true, runValidators: true }
    )
      .populate("address._id")
      .populate("pictures._id");

    const updatedWithId = withGeneratedId(updatedRecord);
    const homeownerName = formatHomeownerName(updatedWithId);

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `updated homeowner ${homeownerName}`,
        metadata: {
          record_id: String(updatedWithId._id || ""),
          generated_id: String(updatedWithId.generated_id || ""),
          homeowner_name: homeownerName,
          picture_id: String(picture._id || ""),
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError.message || auditError);
    }

    return NextResponse.json({ success: true, data: updatedWithId }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update homeowner photo." },
      { status: 500 }
    );
  }
}
