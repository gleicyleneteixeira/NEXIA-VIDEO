import { useProjectStore } from "./project-store";
import { useUIStore } from "./ui-store";
import type { Project } from "./types";

/**
 * Runs a mutation on the project store and records it as an undoable command.
 *
 * Because zustand stores are immutable (every mutation produces a NEW project
 * object while File/media references are preserved), capturing the project
 * reference before/after the action gives us a valid snapshot for undo/redo
 * without cloning media blobs.
 *
 * usage:
 *   withHistory("Mover clipe", () => updateItem(id, { startFrame: f }));
 */
export function withHistory(name: string, action: () => void): void {
  const { pushCommand } = useUIStore.getState();
  const before = useProjectStore.getState().project;

  action();

  const after = useProjectStore.getState().project;
  if (before === after) return; // nothing changed
  if (!isProjectSafe(after)) return;

  const setProject = (p: Project) =>
    useProjectStore.setState(() => ({ project: p }));

  pushCommand({
    name,
    execute: () => setProject(after),
    undo: () => setProject(before),
  });
}

/**
 * Captures the current project reference (cheap; immutable snapshots).
 */
export function snapshotProject(): Project {
  return useProjectStore.getState().project;
}

/**
 * Records a command that restores `before` (undo) and `after` (redo).
 * Used for interactive gestures like drag/resize where `action` runs live
 * and only the final state should be committed to history.
 */
export function commitHistory(name: string, before: Project, after?: Project): void {
  const { pushCommand } = useUIStore.getState();
  const finalProject = after ?? useProjectStore.getState().project;
  if (before === finalProject) return;
  if (!isProjectSafe(finalProject)) return;

  const setProject = (p: Project) =>
    useProjectStore.setState(() => ({ project: p }));

  pushCommand({
    name,
    execute: () => setProject(finalProject),
    undo: () => setProject(before),
  });
}

function isProjectSafe(project: Project): boolean {
  return !!project && !!project.timeline && Array.isArray(project.timeline.items);
}