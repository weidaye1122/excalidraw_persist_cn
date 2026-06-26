import { useEffect, useState } from "react";
import { getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const BoardNameDialog = ({
  open,
  mode,
  initialValue,
  messages,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  mode: "create" | "rename";
  initialValue: string;
  messages: Messages;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="selfhost-dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="selfhost-dialog"
        role="dialog"
        aria-labelledby="board-name-title"
      >
        <h2 id="board-name-title">
          {mode === "create"
            ? messages.createBoardTitle
            : messages.renameBoardTitle}
        </h2>
        <label className="selfhost-dialog__label" htmlFor="board-name-input">
          {messages.boardNameLabel}
        </label>
        <input
          id="board-name-input"
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={messages.boardNamePlaceholder}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              onConfirm(value.trim());
            }
          }}
        />
        <div className="selfhost-dialog__actions">
          <button
            className="selfhost-button selfhost-button--muted"
            onClick={onCancel}
            type="button"
          >
            {messages.cancel}
          </button>
          <button
            className="selfhost-button"
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
            type="button"
          >
            {messages.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};
