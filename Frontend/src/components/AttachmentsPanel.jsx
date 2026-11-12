import React, { useEffect, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { deleteAttachment, downloadAttachment, getAttachments, uploadAttachment } from "../services/api";
import ConfirmDialog from "./ConfirmDialog";

function sizeLabel(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentsPanel({ entityType, entityId, title = "Attachments" }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    if (!entityType || !entityId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getAttachments(entityType, entityId);
      setAttachments(data.attachments || []);
    } catch (err) {
      setError(err.response?.data?.error || "Attachments could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      await uploadAttachment(formData);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "The file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (attachment) => {
    setError("");
    try {
      await downloadAttachment(attachment.id, attachment.file_name);
    } catch (err) {
      setError(err.response?.data?.error || "The file could not be downloaded.");
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteAttachment(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "The file could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="attachments-panel" aria-label={title}>
      <div className="attachments-head">
        <strong><Paperclip size={14} aria-hidden="true" /> {title}</strong>
        <label className="btn-ghost-dark small">
          {busy ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          <span>{busy ? "Uploading…" : "Upload"}</span>
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.webp,.gif"
            onChange={(event) => {
              upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="attachments-error" role="alert">{error}</p>}
      {loading ? (
        <p className="attachments-empty">Loading files…</p>
      ) : attachments.length === 0 ? (
        <p className="attachments-empty">No files attached. PDF, Office, CSV, ZIP or image files up to 15 MB.</p>
      ) : (
        <ul className="attachments-list">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <FileText size={15} aria-hidden="true" />
              <button type="button" className="attachment-download" onClick={() => download(attachment)}>
                <strong>{attachment.file_name}</strong>
                <span>{sizeLabel(attachment.file_size)} · {new Date(attachment.uploaded_at || attachment.createdAt).toLocaleDateString()}</span>
              </button>
              <button type="button" className="action-icon-btn delete" aria-label={`Delete ${attachment.file_name}`} onClick={() => setPendingDelete(attachment)}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this attachment?"
        message={`“${pendingDelete?.file_name || "File"}” will be permanently removed from this record.`}
        confirmLabel="Delete file"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
