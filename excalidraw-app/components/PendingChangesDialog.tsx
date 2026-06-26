import { getMessages } from "../selfhost/ui";

type Messages = ReturnType<typeof getMessages>;

export const PendingChangesDialog = ({
  open,
  messages,
  isSaving,
  onCancel,
  onDiscard,
  onSave,
}: {
  open: boolean;
  messages: Messages;
  isSaving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="selfhost-dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="selfhost-dialog"
        role="dialog"
        aria-labelledby="pending-changes-title"
      >
        <h2 id="pending-changes-title">{messages.pendingChangesTitle}</h2>
        <p>{messages.pendingChangesDescription}</p>
        <div className="selfhost-dialog__actions">
          <button
            className="selfhost-button selfhost-button--muted"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            {messages.cancel}
          </button>
          <button
            className="selfhost-button selfhost-button--danger"
            disabled={isSaving}
            onClick={onDiscard}
            type="button"
          >
            {messages.discardChanges}
          </button>
          <button
            className="selfhost-button"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? messages.savingBoard : messages.saveAndContinue}
          </button>
        </div>
      </div>
    </div>
  );
};
