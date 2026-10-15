// POST /api/upload — faculty uploads a PDF/PPT to a unit (multipart/form-data). Owner: BE.
// Fields: file, unitId, visibleSections ("A,B,C").  Response: 201 { resource: Resource } or { error }.
// Works in both modes: the gateway decides (mock stores nothing; real lands in BE-4.3).
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES, UploadResourceFields } from "@/contracts/resources";
import { requireFaculty } from "@/lib/auth/guards";
import { getGateway } from "@/lib/gateway";
import { errorResponse, toErrorPayload, validationError } from "@/lib/actions/result";

export async function POST(request: Request) {
  try {
    await requireFaculty();
  } catch (error) {
    return errorResponse(toErrorPayload(error));
  }

  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse({ code: "VALIDATION", message: "Expected multipart/form-data." });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse({ code: "VALIDATION", message: "Choose a file to upload.", fieldErrors: { file: ["Required"] } });
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  const isAllowed = file.type in ALLOWED_UPLOAD_MIME_TYPES || (ext && ["pdf", "ppt", "pptx"].includes(ext));
  if (!isAllowed) {
    return errorResponse({
      code: "VALIDATION",
      message: "Only PDF, PPT and PPTX files are allowed.",
      fieldErrors: { file: ["Unsupported file type"] },
    });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errorResponse({
      code: "VALIDATION",
      message: `Files must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller.`,
      fieldErrors: { file: ["File too large"] },
    });
  }

  const fields = UploadResourceFields.safeParse({
    unitId: form.get("unitId"),
    visibleSections: String(form.get("visibleSections") ?? "")
      .split(",")
      .map((section) => section.trim())
      .filter(Boolean),
  });
  if (!fields.success) return errorResponse(validationError(fields.error));

  try {
    const resource = await getGateway().resources.uploadResource({ ...fields.data, file });
    return Response.json({ resource }, { status: 201 });
  } catch (error) {
    return errorResponse(toErrorPayload(error));
  }
}
