// Neon Object Storage (S3-compatible) via the Files SDK. Owner: BE.
// Credentials, endpoint and region come from the AWS_* env vars that `neon deploy` pulls.
// Store the object KEY in Postgres and hand out short-lived presigned URLs on read.
import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

export const UPLOADS_BUCKET = "nodus-uploads";

function createStorage() {
  return new Files({ adapter: neon({ bucket: UPLOADS_BUCKET }) });
}

let instance: ReturnType<typeof createStorage> | undefined;

export function getStorage() {
  instance ??= createStorage();
  return instance;
}
