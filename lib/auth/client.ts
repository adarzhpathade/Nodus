"use client";
// Browser auth client. Talks to the same-origin proxy at /api/auth — takes no arguments. Owner: BE.
import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();
