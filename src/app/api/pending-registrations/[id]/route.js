import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/server/db";
import PendingRegistration from "@/lib/server/models/pendingRegistrations";
import Record from "@/lib/server/models/records";
import Address from "@/lib/server/models/address";
import User from "@/lib/server/models/users";
import { requireAuth, requireRole } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { sendRegistrationStatusEmail, sendAccountActivationEmail } from "@/lib/server/services/emailService";

const ACTIVATION_CODE_EXPIRY_HOURS = 72;

function generateActivationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  let user;
  try {
    user = await requireAuth();
    requireRole(user, ["admin", "president"]);
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { action, decline_reason } = body || {};

    if (!["approve", "decline"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action. Must be 'approve' or 'decline'." },
        { status: 400 }
      );
    }

    const pending = await PendingRegistration.findById(id);
    if (!pending) {
      return NextResponse.json(
        { success: false, message: "Pending registration request not found." },
        { status: 404 }
      );
    }

    if (pending.status !== "pending") {
      return NextResponse.json(
        { success: false, message: `This request has already been ${pending.status}.` },
        { status: 400 }
      );
    }

    const fullName = [pending.first_name, pending.middle_name, pending.last_name].filter(Boolean).join(" ");

    if (action === "decline") {
      pending.status = "declined";
      pending.decline_reason = String(decline_reason || "").trim() || "No reason provided.";
      await pending.save();

      try {
        await writeAuditLog({
          request,
          user,
          statusCode: 200,
          detailSummary: `Declined homeowner registration request for ${fullName}`,
          metadata: {
            pending_id: id,
            homeowner_name: fullName,
            reason: pending.decline_reason,
          },
        });
      } catch (auditError) {
        console.error("Failed to write audit log:", auditError);
      }

      if (pending.email) {
        await sendRegistrationStatusEmail({
          toEmail: pending.email,
          status: "declined",
          fullName,
          declineReason: pending.decline_reason,
        });
      }

      return NextResponse.json({ success: true, data: pending }, { status: 200 });
    }

    // action === "approve"
    // 1. If owner, verify no other owner exists at this address
    const isOwner = String(pending.occupant_status || "").toLowerCase() === "owner";
    let addressId = null;

    if (pending.phase !== undefined && pending.block !== undefined && pending.lot !== undefined) {
      let address = await Address.findOne({
        phase: pending.phase,
        block: pending.block,
        lot: pending.lot,
      }).select("_id");

      if (address && isOwner) {
        const existingOwner = await Record.findOne({
          "address._id": address._id,
          occupant_status: { $regex: /^owner$/i },
        }).select("_id");

        if (existingOwner) {
          return NextResponse.json(
            { success: false, message: `An owner already exists for the address Phase ${pending.phase}, Block ${pending.block}, Lot ${pending.lot}.` },
            { status: 409 }
          );
        }
      }

      if (!address) {
        address = await Address.create({
          phase: pending.phase,
          block: pending.block,
          lot: pending.lot,
        });
      }
      addressId = address._id;
    }

    // 2. Generate Unique Generated ID
    const entryYear = pending.entry_date ? new Date(pending.entry_date).getFullYear() : new Date().getFullYear();
    let generatedId = "";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      const candidate = `${entryYear}${suffix}`;
      const exists = await Record.findOne({ generated_id: candidate }).select("_id").lean();
      if (!exists) {
        generatedId = candidate;
        break;
      }
    }

    if (!generatedId) {
      generatedId = `${entryYear}${String(Date.now()).slice(-4)}`;
    }

    // 3. Construct Record Payload
    const recordPayload = {
      last_name: pending.last_name,
      first_name: pending.first_name,
      middle_name: pending.middle_name,
      phone_number: pending.phone_number,
      job_title: pending.job_title,
      work_status: pending.work_status,
      entry_month: pending.entry_month,
      entry_date: pending.entry_date,
      occupant_status: pending.occupant_status || "Owner",
      household_members: pending.household_members,
      email: pending.email,
      "address._id": addressId,
      status: isOwner ? ["HO, not HVNA member"] : ["N/A"],
      generated_id: generatedId,
    };

    if (pending.picture_id) {
      recordPayload["pictures._id"] = pending.picture_id;
    }

    // 4. Create Homeowner Record & Update Pending Request
    const newRecord = await Record.create(recordPayload);
    pending.status = "approved";
    await pending.save();

    try {
      await writeAuditLog({
        request,
        user,
        statusCode: 200,
        detailSummary: `Approved homeowner registration request for ${fullName}`,
        metadata: {
          pending_id: id,
          record_id: String(newRecord._id),
          generated_id: generatedId,
          homeowner_name: fullName,
        },
      });
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError);
    }

    // 5. Create / update homeowner User account & send activation email
    if (pending.email) {
      const normalizedEmail = pending.email.trim().toLowerCase();

      // Generate a fresh activation code
      const activationCode = generateActivationCode();
      const codeHash = hashCode(activationCode);
      const expiresAt = new Date(Date.now() + ACTIVATION_CODE_EXPIRY_HOURS * 60 * 60 * 1000);

      let existingUser = await User.findOne({ email: normalizedEmail });

      if (!existingUser) {
        // Create user with temporary random password (will be replaced on activation)
        const tempPassword = crypto.randomBytes(32).toString("hex") + "A!a1";
        existingUser = await User.create({
          first_name: pending.first_name || "",
          last_name: pending.last_name || "",
          email: normalizedEmail,
          password: tempPassword,
          role: "homeowner",
          status: "active",
          password_reset_code_hash: codeHash,
          password_reset_code_expires_at: expiresAt,
        });
      } else {
        // User already exists — refresh their activation code so they can still activate
        // Reset their password to a temporary one so they must go through activation
        const tempPassword = crypto.randomBytes(32).toString("hex") + "A!a1";
        existingUser.password = tempPassword;
        existingUser.password_reset_code_hash = codeHash;
        existingUser.password_reset_code_expires_at = expiresAt;
        await existingUser.save();
      }

      // Build activation URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      const activationUrl = `${baseUrl}/activate-account?email=${encodeURIComponent(normalizedEmail)}&code=${activationCode}`;

      // Send activation email with approval message (same email for both cases)
      const emailResult = await sendAccountActivationEmail({
        toEmail: normalizedEmail,
        fullName,
        activationCode,
        activationUrl,
        expiresInHours: ACTIVATION_CODE_EXPIRY_HOURS,
      });

      if (emailResult.delivered === false) {
        console.error(`[Approval] Failed to send activation email to ${normalizedEmail}. SMTP may not be configured.`);
        // Log the activation code in dev so the flow can still be tested
        if (process.env.NODE_ENV !== "production") {
          console.log(`[Dev] Activation code for ${normalizedEmail}: ${activationCode}`);
          console.log(`[Dev] Activation URL: ${activationUrl}`);
        }
      }
    }

    return NextResponse.json({ success: true, data: pending, record: newRecord }, { status: 200 });
  } catch (error) {
    console.error("Action on pending registration failed:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to process registration request." },
      { status }
    );
  }
}
