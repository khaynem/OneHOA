import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import Picture from "@/lib/server/models/pictures";
import { uploadImageDataUrl } from "@/lib/server/services/cloudinaryService";

export const runtime = "nodejs";

export async function POST(request) {
  try {
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

    const uploadResult = await uploadImageDataUrl(imageDataUrl);

    const picture = await Picture.create({
      filename: String(
        fileName || uploadResult.original_filename || uploadResult.public_id || "public-photo"
      ),
      path: uploadResult.secure_url,
      mime_type: String(mimeType || uploadResult.resource_type || "image"),
      uploaded_at: new Date(),
    });

    return NextResponse.json({ success: true, data: picture }, { status: 201 });
  } catch (error) {
    console.error("Public photo upload failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to upload photo." },
      { status: 500 }
    );
  }
}
