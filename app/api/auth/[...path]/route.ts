// Proxies every /api/auth/* request to Neon Auth. Owner: BE.
// The handler is created on first request, so builds without auth env vars (mock-only work) still pass.
import { getAuth } from "@/lib/auth/server";

type Handlers = ReturnType<ReturnType<typeof getAuth>["handler"]>;
type Context = Parameters<Handlers["GET"]>[1];

let handlers: Handlers | undefined;

function forward(method: keyof Handlers) {
  return (request: Request, context: Context) => {
    handlers ??= getAuth().handler();
    return handlers[method](request, context);
  };
}

export const GET = forward("GET");
export const POST = forward("POST");
export const PUT = forward("PUT");
export const DELETE = forward("DELETE");
export const PATCH = forward("PATCH");
