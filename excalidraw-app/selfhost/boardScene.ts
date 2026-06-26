import { restore, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { BoardRecord, BoardScenePayload } from "./types";

export const createEmptyBoardScene = (): BoardScenePayload => ({
  elements: [],
  appState: {},
  files: {},
  libraryItems: [],
});

export const toBoardScenePayload = ({
  elements,
  appState,
  files,
  libraryItems,
  name,
}: BoardScenePayload & {
  name: string;
}): BoardScenePayload => {
  const serialized = JSON.parse(
    serializeAsJSON(elements, appState, files, name),
  ) as {
    elements?: BoardScenePayload["elements"];
    appState?: BoardScenePayload["appState"];
    files?: BoardScenePayload["files"];
  };

  return {
    elements: serialized.elements || [],
    appState: serialized.appState || {},
    files: serialized.files || {},
    libraryItems: Array.isArray(libraryItems) ? libraryItems : [],
  };
};

export const createBoardFingerprint = (
  board:
    | BoardRecord
    | (BoardScenePayload & {
        name: string;
      }),
) =>
  JSON.stringify({
    name: board.name,
    elements: board.elements,
    appState: board.appState,
    files: board.files,
    libraryItems: board.libraryItems,
  });

export const toExcalidrawInitialData = (
  board: BoardRecord,
): ExcalidrawInitialDataState =>
  restore(
    {
      elements: board.elements,
      appState: board.appState,
      files: board.files,
      libraryItems: board.libraryItems,
    },
    null,
    null,
    {
      repairBindings: true,
    },
  );
