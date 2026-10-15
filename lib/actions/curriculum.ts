"use server";
// Faculty syllabus editing (units + topics). Owner: BE.
import {
  CreateTopicInput,
  CreateUnitInput,
  DeleteTopicInput,
  DeleteUnitInput,
  RenameTopicInput,
  RenameUnitInput,
  ReorderInput,
} from "@/contracts/curriculum";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

export async function createUnit(input: CreateUnitInput) {
  return runAction(CreateUnitInput, input, (data) => getGateway().curriculum.createUnit(data));
}

export async function renameUnit(input: RenameUnitInput) {
  return runAction(RenameUnitInput, input, (data) => getGateway().curriculum.renameUnit(data));
}

export async function reorderUnits(input: ReorderInput) {
  return runAction(ReorderInput, input, (data) => getGateway().curriculum.reorderUnits(data));
}

export async function deleteUnit(input: DeleteUnitInput) {
  return runAction(DeleteUnitInput, input, (data) => getGateway().curriculum.deleteUnit(data));
}

export async function createTopic(input: CreateTopicInput) {
  return runAction(CreateTopicInput, input, (data) => getGateway().curriculum.createTopic(data));
}

export async function renameTopic(input: RenameTopicInput) {
  return runAction(RenameTopicInput, input, (data) => getGateway().curriculum.renameTopic(data));
}

export async function reorderTopics(input: ReorderInput) {
  return runAction(ReorderInput, input, (data) => getGateway().curriculum.reorderTopics(data));
}

export async function deleteTopic(input: DeleteTopicInput) {
  return runAction(DeleteTopicInput, input, (data) => getGateway().curriculum.deleteTopic(data));
}
