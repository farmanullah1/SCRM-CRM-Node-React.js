import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

/**
 * Branded confirmation dialog used for destructive workspace actions.
 * Native window.confirm/alert are intentionally not used.
 */
export default function ConfirmDialog({
  open,
  title = "Confirm action",
  message,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  useEffect(() => {
    if (!open) return undefined;

    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(dialog?.querySelectorAll("button:not([disabled])") || []).filter(
        (element) => element.offsetParent !== null
      );

    cancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
        return;
      }
      if (event.key === "Enter" && event.target === cancelRef.current) return;
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const [first, last] = [items[0], items[items.length - 1]];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog confirm-dialog--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <button
          type="button"
          className="confirm-dialog-close"
          onClick={onCancel}
          aria-label="Close confirmation"
          disabled={busy}
        >
          <X size={17} />
        </button>
        <div className="confirm-dialog-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        {detail && <div className="confirm-dialog-detail">{detail}</div>}
        <div className="confirm-dialog-actions">
          <button ref={cancelRef} type="button" className="btn-ghost-dark" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "btn-danger" : "btn-primary-yellow"}
            onClick={() => confirmRef.current?.()}
            disabled={busy}
          >
            {busy && <Loader2 size={15} className="spin" aria-hidden="true" />}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
