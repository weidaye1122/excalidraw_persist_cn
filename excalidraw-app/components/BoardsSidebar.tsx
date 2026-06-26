import { useState } from "react";
import type { BoardListItem } from "../selfhost/types";
import { formatBoardTimestamp, getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const BoardsSidebar = ({
  messages,
  langCode,
  boards,
  deletedBoards,
  activeBoardId,
  isOpen,
  onClose,
  onCreateBoard,
  onSelectBoard,
  onRenameBoard,
  onDeleteBoard,
  onRestoreBoard,
  onLogout,
}: {
  messages: Messages;
  langCode: string;
  boards: BoardListItem[];
  deletedBoards: BoardListItem[];
  activeBoardId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: () => void;
  onSelectBoard: (boardId: string) => void;
  onRenameBoard: (board: BoardListItem) => void;
  onDeleteBoard: (boardId: string) => void;
  onRestoreBoard: (boardId: string) => void;
  onLogout: () => void;
}) => {
  const [showDeletedBoards, setShowDeletedBoards] = useState(false);

  return (
    <>
      <div
        className={`selfhost-sidebar-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
      />
      <aside className={`selfhost-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="selfhost-sidebar__header">
          <div>
            <div className="selfhost-sidebar__title">{messages.boards}</div>
            <div className="selfhost-sidebar__subtitle">
              {messages.saveShortcutHint}
            </div>
          </div>
          <button className="selfhost-button" onClick={onCreateBoard} type="button">
            {messages.newBoard}
          </button>
        </div>

        <div className="selfhost-sidebar__section">
          {boards.length ? (
            boards.map((board) => (
              <div
                className={`selfhost-board-row ${
                  board.id === activeBoardId ? "is-active" : ""
                }`}
                key={board.id}
              >
                <button
                  className="selfhost-board-row__main"
                  onClick={() => onSelectBoard(board.id)}
                  type="button"
                >
                  <span className="selfhost-board-row__name">{board.name}</span>
                  <span className="selfhost-board-row__time">
                    {messages.updatedAt}:{" "}
                    {formatBoardTimestamp(board.updatedAt, langCode)}
                  </span>
                </button>
                <div className="selfhost-board-row__actions">
                  <button
                    className="selfhost-link-button"
                    onClick={() => onRenameBoard(board)}
                    type="button"
                  >
                    {messages.renameBoard}
                  </button>
                  <button
                    className="selfhost-link-button selfhost-link-button--danger"
                    onClick={() => onDeleteBoard(board.id)}
                    type="button"
                  >
                    {messages.deleteBoard}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="selfhost-sidebar__empty">{messages.emptyBoards}</div>
          )}
        </div>

        <div className="selfhost-sidebar__section">
          <button
            className="selfhost-section-toggle"
            onClick={() => setShowDeletedBoards((current) => !current)}
            type="button"
          >
            <span>{messages.recycleBin}</span>
            <span>{showDeletedBoards ? "−" : "+"}</span>
          </button>
          {showDeletedBoards ? (
            deletedBoards.length ? (
              deletedBoards.map((board) => (
                <div className="selfhost-board-row" key={board.id}>
                  <div className="selfhost-board-row__main selfhost-board-row__main--static">
                    <span className="selfhost-board-row__name">{board.name}</span>
                    <span className="selfhost-board-row__time">
                      {formatBoardTimestamp(board.updatedAt, langCode)}
                    </span>
                  </div>
                  <div className="selfhost-board-row__actions">
                    <button
                      className="selfhost-link-button"
                      onClick={() => onRestoreBoard(board.id)}
                      type="button"
                    >
                      {messages.restoreBoard}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="selfhost-sidebar__empty">
                {messages.emptyRecycleBin}
              </div>
            )
          ) : null}
        </div>

        <div className="selfhost-sidebar__footer">
          <button
            className="selfhost-button selfhost-button--muted"
            onClick={onLogout}
            type="button"
          >
            {messages.logout}
          </button>
        </div>
      </aside>
    </>
  );
};
