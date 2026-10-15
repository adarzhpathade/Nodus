"use server";
// Notes: create, auto-save, links, previews, quick switcher. Owner: BE.
import {
  AddLinkInput,
  CreateNoteInput,
  LinkTarget,
  ListNotesQuery,
  NoteIdInput,
  QuickSearchInput,
  RemoveLinkInput,
  UpdateNoteInput,
} from "@/contracts/notes";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

/** For client-side filtering / infinite scroll. Server components can call the gateway directly. */
export async function listNotes(query: ListNotesQuery) {
  return runAction(ListNotesQuery, query, (data) => getGateway().notes.listNotes(data));
}

export async function createNote(input: CreateNoteInput) {
  return runAction(CreateNoteInput, input, (data) => getGateway().notes.createNote(data));
}

/** Auto-save: debounce on the client, send only changed fields. */
export async function updateNote(input: UpdateNoteInput) {
  return runAction(UpdateNoteInput, input, (data) => getGateway().notes.updateNote(data));
}

export async function deleteNote(input: NoteIdInput) {
  return runAction(NoteIdInput, input, (data) => getGateway().notes.deleteNote(data));
}

export async function addNoteLink(input: AddLinkInput) {
  return runAction(AddLinkInput, input, (data) => getGateway().notes.addLink(data));
}

export async function removeNoteLink(input: RemoveLinkInput) {
  return runAction(RemoveLinkInput, input, (data) => getGateway().notes.removeLink(data));
}

/** Hover preview on links in the editor. */
export async function getLinkPreview(target: LinkTarget) {
  return runAction(LinkTarget, target, (data) => getGateway().notes.getLinkPreview(data));
}

/** Ctrl+K quick switcher. */
export async function quickSearch(input: QuickSearchInput) {
  return runAction(QuickSearchInput, input, (data) => getGateway().notes.quickSearch(data));
}

export async function exportNoteMarkdown(input: NoteIdInput) {
  return runAction(NoteIdInput, input, (data) => getGateway().notes.exportMarkdown(data));
}
