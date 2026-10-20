# Task: fe-6-fixes (Gemini, FRONTEND) - fix type errors in your FE-6 work
Work ONLY in `E:/Projects/College Projects/nodus-fe6`. No shell or git; file tools only. Edit only files under components/graph/**, stores/**, app/(student)/graph/**, app/(faculty)/faculty/graph/**. Do not touch contracts or lib.

The reviewer ran `tsc --noEmit` and got these errors. Fix ALL of them (print STEP n DONE after each):

1. `components/graph/SidePanel.tsx` and `FacultySidePanel.tsx`: `res.fileUrl` does not exist on `Resource`. Resources are opened through the server action `getResourceAccess({ resourceId })` from `@/lib/actions/resources` (returns a presigned `url`). Copy how `components/student/ResourceList.tsx` opens a resource (button that calls the action then opens the url), and use that instead of an `href`.
2. `components/graph/HoverCard.tsx` line ~58: the hover card is a union (`kind` "subject" | "unit" student | faculty unit with `averagePercent`). Narrow with `kind` / `"averagePercent" in card` before reading `percent`; faculty variant uses `averagePercent`.
3. React Flow v12 typing: define `export type GraphFlowNode = Node<CustomNodeData>` (import `Node`, `NodeProps`, `Position` from `@xyflow/react`) and type every custom node as `NodeProps<GraphFlowNode>` (SemesterNode, SubjectNode, TopicNode, UnitNode). `CustomNodeData` must be a `type` alias with an index signature compatible with `Record<string, unknown>` (use `type CustomNodeData = {...}` not `interface`). In `layout.ts` use `Position.Left` / `Position.Right` (enum), not the strings "left"/"right", and return `GraphFlowNode[]`. Make `nodeTypes` in TreeGraph.tsx type-check without casts to `any`.
4. Re-read every file you touched and make sure no `any`, no hex colors, no `text-[Npx]`.

Do not change behaviour beyond these fixes. End with a Report listing each fix. Reviewer will re-run tsc.
