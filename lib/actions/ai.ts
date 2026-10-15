"use server";
// AI actions (non-streaming). The tutor chat streams via POST /api/ai/tutor instead. Owner: BE.
import {
  AnalyzeNoteInput,
  ConversationIdInput,
  GapReportInput,
  GenerateQuizInput,
  ListQuizAttemptsQuery,
  SubmitQuizInput,
} from "@/contracts/ai";
import { getGateway } from "@/lib/gateway";
import { runAction, runQuery } from "./result";

export async function listConversations() {
  return runQuery(() => getGateway().ai.listConversations());
}

export async function getConversation(input: ConversationIdInput) {
  return runAction(ConversationIdInput, input, (data) => getGateway().ai.getConversation(data.conversationId));
}

export async function deleteConversation(input: ConversationIdInput) {
  return runAction(ConversationIdInput, input, (data) => getGateway().ai.deleteConversation(data));
}

export async function generateQuiz(input: GenerateQuizInput) {
  return runAction(GenerateQuizInput, input, (data) => getGateway().ai.generateQuiz(data));
}

export async function submitQuizAttempt(input: SubmitQuizInput) {
  return runAction(SubmitQuizInput, input, (data) => getGateway().ai.submitQuizAttempt(data));
}

export async function listQuizAttempts(query: ListQuizAttemptsQuery) {
  return runAction(ListQuizAttemptsQuery, query, (data) => getGateway().ai.listQuizAttempts(data));
}

export async function analyzeNote(input: AnalyzeNoteInput) {
  return runAction(AnalyzeNoteInput, input, (data) => getGateway().ai.analyzeNote(data));
}

export async function getGapReport(input: GapReportInput) {
  return runAction(GapReportInput, input, (data) => getGateway().ai.getGapReport(data));
}
