import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Picture from "@/lib/server/models/pictures";
import { uploadImageDataUrl } from "@/lib/server/services/cloudinaryService";
import { requireAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await requireAuth();
    await connectToDatabase();

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

    const uploadResult = await uploadImageDataUrl(imageDataUrl, {
      folder: process.env.CLOUDINARY_ACTIVITY_FOLDER || process.env.CLOUDINARY_FOLDER || "onehoa/activities",
    });

    const picture = await Picture.create({
      filename: String(
        fileName || uploadResult.original_filename || uploadResult.public_id || "activity-photo"
      ),
      path: uploadResult.secure_url,
      mime_type: String(mimeType || uploadResult.resource_type || "image"),
      uploaded_at: new Date(),
    });

    return NextResponse.json({ success: true, data: picture }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload activity photo." },
      { status: 500 }
    );
  }
}
