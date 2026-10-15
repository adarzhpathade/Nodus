"use server";
// Resource actions. Uploading is NOT here — use the route `POST /api/upload`. Owner: BE.
import { ResourceIdInput, UpdateVisibilityInput } from "@/contracts/resources";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

/** Presigned link to open/download a file (call on click; it expires). */
export async function getResourceAccess(input: ResourceIdInput) {
  return runAction(ResourceIdInput, input, (data) => getGateway().resources.getResourceAccess(data));
}

/** Poll while a fresh upload is "processing". */
export async function getResource(input: ResourceIdInput) {
  return runAction(ResourceIdInput, input, (data) => getGateway().resources.getResource(data.resourceId));
}

export async function updateResourceVisibility(input: UpdateVisibilityInput) {
  return runAction(UpdateVisibilityInput, input, (data) => getGateway().resources.updateVisibility(data));
}

export async function deleteResource(input: ResourceIdInput) {
  return runAction(ResourceIdInput, input, (data) => getGateway().resources.deleteResource(data));
}
