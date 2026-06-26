import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  LibraryItems,
} from "@excalidraw/excalidraw/types";

export type BoardScenePayload = {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  libraryItems: LibraryItems;
};

export type BoardListItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BoardRecord = BoardListItem & BoardScenePayload;

export type SessionResponse = {
  authenticated: boolean;
};
