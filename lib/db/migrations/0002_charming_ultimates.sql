CREATE INDEX "activity_log_student_type_ref_idx" ON "activity_log" USING btree ("student_id","type","ref_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_time_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "ai_messages_topic_role_idx" ON "ai_messages" USING btree ("topic_id","role");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_quiz_idx" ON "quiz_attempts" USING btree ("student_id","quiz_id");--> statement-breakpoint
CREATE INDEX "assignment_sections_section_idx" ON "assignment_sections" USING btree ("section","assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_status_student_status_idx" ON "assignment_status" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "assignments_unit_due_idx" ON "assignments" USING btree ("unit_id","due_at");--> statement-breakpoint
CREATE INDEX "resources_unit_status_idx" ON "resources" USING btree ("unit_id","ingestion_status");--> statement-breakpoint
CREATE INDEX "note_links_target_from_idx" ON "note_links" USING btree ("to_type","to_id","from_note_id");--> statement-breakpoint
CREATE INDEX "notes_owner_topic_updated_idx" ON "notes" USING btree ("owner_id","topic_id","updated_at");