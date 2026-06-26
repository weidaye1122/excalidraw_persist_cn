import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  LibraryItems,
} from "@excalidraw/excalidraw/types";
import { Provider } from "./app-jotai";
import { useAppLangCode } from "./app-language/language-state";
import { BoardNameDialog } from "./components/BoardNameDialog";
import { BoardsSidebar } from "./components/BoardsSidebar";
import { LoginScreen } from "./components/LoginScreen";
import { PendingChangesDialog } from "./components/PendingChangesDialog";
import { SelfHostedMainMenu } from "./components/SelfHostedMainMenu";
import { SelfHostedWelcomeScreen } from "./components/SelfHostedWelcomeScreen";
import {
  createBoardFingerprint,
  createEmptyBoardScene,
  toBoardScenePayload,
  toExcalidrawInitialData,
} from "./selfhost/boardScene";
import { api, isApiError } from "./selfhost/api";
import type { BoardListItem, BoardRecord } from "./selfhost/types";
import { formatBoardTimestamp, getMessages } from "./selfhost/ui";
import { useHandleAppTheme } from "./useHandleAppTheme";

import "./selfhost.scss";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type PendingAction =
  | { type: "select"; boardId: string }
  | { type: "create"; name: string }
  | { type: "delete"; boardId: string }
  | { type: "logout" }
  | null;

type BoardNameState =
  | {
      mode: "create" | "rename";
      boardId?: string;
      initialValue: string;
    }
  | null;

const Shell = () => {
  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();
  const [langCode] = useAppLangCode();
  const messages = useMemo(() => getMessages(langCode), [langCode]);

  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [deletedBoards, setDeletedBoards] = useState<BoardListItem[]>([]);
  const [activeBoard, setActiveBoard] = useState<BoardRecord | null>(null);
  const [initialData, setInitialData] = useState(
    toExcalidrawInitialData({
      id: "boot",
      name: messages.boardNamePlaceholder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ...createEmptyBoardScene(),
    }),
  );
  const [editorKey, setEditorKey] = useState(0);
  const [isBoardLoading, setIsBoardLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [boardNameState, setBoardNameState] = useState<BoardNameState>(null);

  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const activeBoardRef = useRef<BoardRecord | null>(null);
  const currentSceneRef = useRef<{
    elements: readonly OrderedExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
  }>({
    elements: [],
    appState: {},
    files: {},
  });
  const libraryItemsRef = useRef<LibraryItems>([]);
  const lastSavedFingerprintRef = useRef("");
  const shouldCompareNextChangeRef = useRef(false);
  const shouldCompareNextLibraryChangeRef = useRef(false);

  const getErrorMessage = useCallback(
    (error: unknown) => {
      if (isApiError(error)) {
        return error.message;
      }

      if (error instanceof Error && error.message) {
        return error.message;
      }

      return messages.serverError;
    },
    [messages.serverError],
  );

  const resetToSignedOut = useCallback(() => {
    setAuthStatus("unauthenticated");
    setLoginError("");
    setBoards([]);
    setDeletedBoards([]);
    setActiveBoard(null);
    activeBoardRef.current = null;
    setIsDirty(false);
    setIsSaving(false);
    setSidebarOpen(false);
    setPendingAction(null);
    setBoardNameState(null);
  }, []);

  const syncBoardsFromServer = useCallback(async () => {
    const { boards: allBoards } = await api.listBoards(true);
    const nextBoards = allBoards.filter((board) => !board.deletedAt);
    const nextDeletedBoards = allBoards.filter((board) => !!board.deletedAt);
    setBoards(nextBoards);
    setDeletedBoards(nextDeletedBoards);
    return {
      boards: nextBoards,
      deletedBoards: nextDeletedBoards,
    };
  }, []);

  const loadBoardById = useCallback(
    async (boardId: string) => {
      setIsBoardLoading(true);

      try {
        const { board } = await api.getBoard(boardId);

        setActiveBoard(board);
        activeBoardRef.current = board;
        currentSceneRef.current = {
          elements: board.elements as OrderedExcalidrawElement[],
          appState: board.appState,
          files: board.files,
        };
        libraryItemsRef.current = board.libraryItems;
        lastSavedFingerprintRef.current = createBoardFingerprint(board);
        shouldCompareNextChangeRef.current = true;
        shouldCompareNextLibraryChangeRef.current = true;
        setInitialData(toExcalidrawInitialData(board));
        setEditorKey((value) => value + 1);
        setIsDirty(false);
      } finally {
        setIsBoardLoading(false);
      }
    },
    [],
  );

  const bootstrapBoards = useCallback(
    async (preferredBoardId?: string) => {
      const { boards: availableBoards } = await syncBoardsFromServer();
      let nextBoardId =
        preferredBoardId &&
        availableBoards.some((board) => board.id === preferredBoardId)
          ? preferredBoardId
          : availableBoards[0]?.id;

      if (!nextBoardId) {
        const { board } = await api.createBoard(messages.boardNamePlaceholder);
        await syncBoardsFromServer();
        nextBoardId = board.id;
      }

      if (nextBoardId) {
        await loadBoardById(nextBoardId);
      }
    },
    [loadBoardById, messages.boardNamePlaceholder, syncBoardsFromServer],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await api.getSession();

        if (cancelled) {
          return;
        }

        if (!session.authenticated) {
          setAuthStatus("unauthenticated");
          return;
        }

        setAuthStatus("authenticated");
        await bootstrapBoards();
      } catch (error) {
        if (!cancelled) {
          setAuthStatus("unauthenticated");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapBoards]);

  const saveActiveBoard = useCallback(
    async (options?: { name?: string; silent?: boolean }) => {
      const board = activeBoardRef.current;

      if (!board) {
        return false;
      }

      setIsSaving(true);

      try {
        const payload = toBoardScenePayload({
          elements: currentSceneRef.current.elements,
          appState: currentSceneRef.current.appState,
          files: currentSceneRef.current.files,
          libraryItems: libraryItemsRef.current,
          name: options?.name || board.name,
        });

        const { board: savedBoard } = await api.updateBoard(board.id, {
          ...payload,
          name: options?.name || board.name,
        });

        setActiveBoard(savedBoard);
        activeBoardRef.current = savedBoard;
        lastSavedFingerprintRef.current = createBoardFingerprint(savedBoard);
        setIsDirty(false);
        await syncBoardsFromServer();

        if (!options?.silent) {
          excalidrawAPIRef.current?.setToast({
            message: messages.boardSaved,
          });
        }

        return true;
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          resetToSignedOut();
          return false;
        }

        excalidrawAPIRef.current?.setToast({
          message: getErrorMessage(error),
          closable: true,
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [getErrorMessage, messages.boardSaved, resetToSignedOut, syncBoardsFromServer],
  );

  const handleSaveShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }

      event.preventDefault();
      void saveActiveBoard();
    },
    [saveActiveBoard],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleSaveShortcut);

    return () => {
      window.removeEventListener("keydown", handleSaveShortcut);
    };
  }, [handleSaveShortcut]);

  useEffect(() => {
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (!isDirty && !isSaving) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [isDirty, isSaving]);

  const executePendingAction = useCallback(
    async (action: Exclude<PendingAction, null>) => {
      try {
        if (action.type === "select") {
          await loadBoardById(action.boardId);
          setSidebarOpen(false);
          return;
        }

        if (action.type === "create") {
          const { board } = await api.createBoard(action.name);
          await syncBoardsFromServer();
          await loadBoardById(board.id);
          setSidebarOpen(false);
          return;
        }

        if (action.type === "delete") {
          await api.deleteBoard(action.boardId);
          const { boards: remainingBoards } = await syncBoardsFromServer();

          if (activeBoardRef.current?.id === action.boardId) {
            let nextBoardId = remainingBoards[0]?.id;

            if (!nextBoardId) {
              const { board } = await api.createBoard(
                messages.boardNamePlaceholder,
              );
              await syncBoardsFromServer();
              nextBoardId = board.id;
            }

            if (nextBoardId) {
              await loadBoardById(nextBoardId);
            }
          }

          return;
        }

        if (action.type === "logout") {
          await api.logout();
          resetToSignedOut();
        }
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          resetToSignedOut();
          return;
        }

        excalidrawAPIRef.current?.setToast({
          message: getErrorMessage(error),
          closable: true,
        });
      }
    },
    [
      getErrorMessage,
      loadBoardById,
      messages.boardNamePlaceholder,
      resetToSignedOut,
      syncBoardsFromServer,
    ],
  );

  const handleResolvePendingAction = useCallback(
    async (mode: "cancel" | "discard" | "save") => {
      const action = pendingAction;

      if (!action) {
        return;
      }

      if (mode === "cancel") {
        setPendingAction(null);
        return;
      }

      if (mode === "save") {
        const saved = await saveActiveBoard({ silent: true });

        if (!saved) {
          return;
        }
      }

      setPendingAction(null);
      await executePendingAction(action);
    },
    [executePendingAction, pendingAction, saveActiveBoard],
  );

  const handleLogin = useCallback(
    async (password: string) => {
      setIsLoggingIn(true);
      setLoginError("");

      try {
        const session = await api.login(password);

        if (!session.authenticated) {
          setLoginError(messages.invalidPassword);
          return;
        }

        setAuthStatus("authenticated");
        await bootstrapBoards();
      } catch (error) {
        setLoginError(getErrorMessage(error));
        setAuthStatus("unauthenticated");
      } finally {
        setIsLoggingIn(false);
      }
    },
    [bootstrapBoards, getErrorMessage, messages.invalidPassword],
  );

  const requestBoardOpen = useCallback(
    (boardId: string) => {
      if (boardId === activeBoardRef.current?.id) {
        setSidebarOpen(false);
        return;
      }

      if (isDirty) {
        setPendingAction({ type: "select", boardId });
        return;
      }

      void executePendingAction({ type: "select", boardId });
    },
    [executePendingAction, isDirty],
  );

  const requestCreateBoard = useCallback(() => {
    setBoardNameState({
      mode: "create",
      initialValue: messages.boardNamePlaceholder,
    });
  }, [messages.boardNamePlaceholder]);

  const requestDeleteBoard = useCallback(
    (boardId: string) => {
      if (boardId === activeBoardRef.current?.id && isDirty) {
        setPendingAction({ type: "delete", boardId });
        return;
      }

      void executePendingAction({ type: "delete", boardId });
    },
    [executePendingAction, isDirty],
  );

  const requestLogout = useCallback(() => {
    if (isDirty) {
      setPendingAction({ type: "logout" });
      return;
    }

    void executePendingAction({ type: "logout" });
  }, [executePendingAction, isDirty]);

  const handleBoardNameConfirm = useCallback(
    async (name: string) => {
      const boardAction = boardNameState;
      setBoardNameState(null);

      if (!boardAction) {
        return;
      }

      try {
        if (boardAction.mode === "create") {
          if (isDirty) {
            setPendingAction({ type: "create", name });
            return;
          }

          await executePendingAction({ type: "create", name });
          return;
        }

        if (!boardAction.boardId) {
          return;
        }

        if (boardAction.boardId === activeBoardRef.current?.id) {
          await saveActiveBoard({ name, silent: true });
        } else {
          await api.updateBoard(boardAction.boardId, { name });
          await syncBoardsFromServer();
        }
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          resetToSignedOut();
          return;
        }

        excalidrawAPIRef.current?.setToast({
          message: getErrorMessage(error),
          closable: true,
        });
      }
    },
    [
      boardNameState,
      executePendingAction,
      getErrorMessage,
      isDirty,
      resetToSignedOut,
      saveActiveBoard,
      syncBoardsFromServer,
    ],
  );

  const handleRestoreBoard = useCallback(
    async (boardId: string) => {
      try {
        await api.restoreBoard(boardId);
        await syncBoardsFromServer();
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          resetToSignedOut();
          return;
        }

        excalidrawAPIRef.current?.setToast({
          message: getErrorMessage(error),
          closable: true,
        });
      }
    },
    [getErrorMessage, resetToSignedOut, syncBoardsFromServer],
  );

  const onChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      currentSceneRef.current = {
        elements,
        appState,
        files,
      };

      const board = activeBoardRef.current;

      if (!board) {
        return;
      }

      if (shouldCompareNextChangeRef.current) {
        shouldCompareNextChangeRef.current = false;

        const fingerprint = createBoardFingerprint({
          name: board.name,
          ...toBoardScenePayload({
            elements,
            appState,
            files,
            libraryItems: libraryItemsRef.current,
            name: board.name,
          }),
        });

        setIsDirty(fingerprint !== lastSavedFingerprintRef.current);
        return;
      }

      setIsDirty(true);
    },
    [],
  );

  const onLibraryChange = useCallback((libraryItems: LibraryItems) => {
    libraryItemsRef.current = libraryItems;

    const board = activeBoardRef.current;

    if (!board) {
      return;
    }

    if (shouldCompareNextLibraryChangeRef.current) {
      shouldCompareNextLibraryChangeRef.current = false;

      const fingerprint = createBoardFingerprint({
        name: board.name,
        ...toBoardScenePayload({
          elements: currentSceneRef.current.elements,
          appState: currentSceneRef.current.appState,
          files: currentSceneRef.current.files,
          libraryItems,
          name: board.name,
        }),
      });

      setIsDirty(fingerprint !== lastSavedFingerprintRef.current);
      return;
    }

    setIsDirty(true);
  }, []);

  const saveStatus = isSaving
    ? messages.savingBoard
    : isDirty
      ? messages.unsavedChanges
      : activeBoard
        ? `${messages.lastSaved}: ${formatBoardTimestamp(
            activeBoard.updatedAt,
            langCode,
          )}`
        : messages.allChangesSaved;

  if (authStatus === "loading") {
    return <div className="selfhost-loading">{messages.loading}</div>;
  }

  if (authStatus === "unauthenticated") {
    return (
      <LoginScreen
        errorMessage={loginError}
        isSubmitting={isLoggingIn}
        messages={messages}
        onSubmit={handleLogin}
      />
    );
  }

  if (!activeBoard) {
    return <div className="selfhost-loading">{messages.loadingBoard}</div>;
  }

  return (
    <div className="selfhost-shell">
      <BoardsSidebar
        activeBoardId={activeBoard?.id || null}
        boards={boards}
        deletedBoards={deletedBoards}
        isOpen={sidebarOpen}
        langCode={langCode}
        messages={messages}
        onClose={() => setSidebarOpen(false)}
        onCreateBoard={requestCreateBoard}
        onDeleteBoard={requestDeleteBoard}
        onLogout={requestLogout}
        onRenameBoard={(board) =>
          setBoardNameState({
            mode: "rename",
            boardId: board.id,
            initialValue: board.name,
          })
        }
        onRestoreBoard={handleRestoreBoard}
        onSelectBoard={requestBoardOpen}
      />

      <main className="selfhost-editor">
        <div className="selfhost-editor__canvas">
          <Excalidraw
            key={editorKey}
            aiEnabled={false}
            autoFocus={true}
            detectScroll={false}
            excalidrawAPI={(api) => {
              excalidrawAPIRef.current = api;
            }}
            handleKeyboardGlobally={true}
            initialData={initialData}
            langCode={langCode}
            name={activeBoard?.name}
            onChange={onChange}
            onLibraryChange={onLibraryChange}
            renderTopRightUI={(isMobile) => (
              <div className="selfhost-topbar">
                {isMobile ? (
                  <button
                    className="selfhost-button selfhost-button--muted"
                    onClick={() => setSidebarOpen((value) => !value)}
                    type="button"
                  >
                    {sidebarOpen ? messages.closeBoards : messages.openBoards}
                  </button>
                ) : null}
                <div className="selfhost-topbar__status">{saveStatus}</div>
                <button
                  className="selfhost-button"
                  disabled={isSaving || !activeBoard}
                  onClick={() => void saveActiveBoard()}
                  type="button"
                >
                  {isSaving ? messages.savingBoard : messages.saveBoard}
                </button>
              </div>
            )}
            theme={editorTheme}
          >
            <SelfHostedMainMenu
              isMobile={false}
              messages={messages}
              onCreateBoard={requestCreateBoard}
              onLogout={requestLogout}
              onOpenBoards={() => setSidebarOpen(true)}
              onSaveBoard={() => void saveActiveBoard()}
              saveDisabled={isSaving || !activeBoard}
              setTheme={setAppTheme}
              theme={appTheme}
            />
            <SelfHostedWelcomeScreen
              messages={messages}
              onCreateBoard={requestCreateBoard}
            />
          </Excalidraw>
          {isBoardLoading ? (
            <div className="selfhost-editor__loading">{messages.loadingBoard}</div>
          ) : null}
        </div>
      </main>

      <PendingChangesDialog
        isSaving={isSaving}
        messages={messages}
        onCancel={() => void handleResolvePendingAction("cancel")}
        onDiscard={() => void handleResolvePendingAction("discard")}
        onSave={() => void handleResolvePendingAction("save")}
        open={!!pendingAction}
      />

      <BoardNameDialog
        initialValue={boardNameState?.initialValue || ""}
        messages={messages}
        mode={boardNameState?.mode || "create"}
        onCancel={() => setBoardNameState(null)}
        onConfirm={(name) => void handleBoardNameConfirm(name)}
        open={!!boardNameState}
      />
    </div>
  );
};

export default function ExcalidrawApp() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
