import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  LogOut,
  MessageCircle,
  Paperclip,
  QrCode,
  RefreshCw,
  Send,
  Smartphone
} from "lucide-react";
import {
  getWhatsAppMessages,
  getWhatsAppQr,
  getWhatsAppStatus,
  logoutWhatsApp,
  restartWhatsApp,
  sendWhatsAppMedia,
  sendWhatsAppMessage
} from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATE_LABELS = {
  READY: "Connected",
  WAITING_FOR_QR_SCAN: "Waiting for QR scan",
  INITIALIZING: "Starting",
  AUTHENTICATED: "Authenticating",
  DISCONNECTED: "Disconnected",
  AUTH_FAILURE: "Authentication failed",
  STOPPED: "Stopped",
  DISABLED: "Disabled"
};

const timeAgo = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function WhatsAppPanel({ contacts = [], showToast }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const permissionList = user?.permissionList || [];
  const hasAll = Boolean(user?.permissions?.all || permissionList.includes("*"));
  const canManage = hasAll || permissionList.includes("whatsapp.manage");
  const canSend = hasAll || permissionList.includes("whatsapp.send");

  const [target, setTarget] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sendError, setSendError] = React.useState("");
  const [file, setFile] = React.useState(null);
  const [filter, setFilter] = React.useState("");

  const {
    data: statusData,
    isError: statusError,
    error: statusErrorValue
  } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: getWhatsAppStatus,
    refetchInterval: 10000
  });

  const status = statusData?.status;
  const ready = Boolean(status?.ready);

  const { data: qrData, error: qrError, refetch: refetchQr } = useQuery({
    queryKey: ["whatsapp-qr"],
    queryFn: getWhatsAppQr,
    enabled: canManage && !ready && status?.state !== "DISABLED",
    retry: false,
    refetchInterval: ready ? false : 5000
  });

  const { data: messageData, isLoading: loadingMessages } = useQuery({
    queryKey: ["whatsapp-messages", filter],
    queryFn: () => getWhatsAppMessages({ search: filter || undefined, limit: 150 }),
    refetchInterval: 15000
  });

  const sendMutation = useMutation({
    mutationFn: (payload) => sendWhatsAppMessage(payload),
    onSuccess: (data) => {
      setMessage("");
      setFile(null);
      setSendError("");
      showToast?.(`WhatsApp sent to ${data.result?.to || "the recipient"}.`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
    onError: (error) => {
      setSendError(error?.response?.data?.error || "The message could not be sent.");
    }
  });

  const mediaMutation = useMutation({
    mutationFn: (payload) => sendWhatsAppMedia(payload),
    onSuccess: () => {
      setMessage("");
      setFile(null);
      setSendError("");
      showToast?.("WhatsApp attachment sent.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
    onError: (error) => {
      setSendError(error?.response?.data?.error || "The attachment could not be sent.");
    }
  });

  const controlMutation = useMutation({
    mutationFn: (action) => (action === "logout" ? logoutWhatsApp() : restartWhatsApp()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qr"] });
    },
    onError: (error) => {
      showToast?.(error?.response?.data?.error || "The WhatsApp session could not be updated.");
    }
  });

  const handleFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return setFile(null);
    if (selected.size > 10 * 1024 * 1024) {
      setSendError("Attachments must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        name: selected.name,
        mimetype: selected.type || "application/octet-stream",
        dataUrl: String(reader.result),
        preview: selected.type.startsWith("image/") ? String(reader.result) : null
      });
      setSendError("");
    };
    reader.readAsDataURL(selected);
  };

  const handleSend = (event) => {
    event.preventDefault();
    setSendError("");
    if (!target.trim()) return setSendError("Choose a contact or enter a phone number.");
    if (!message.trim() && !file) return setSendError("Write a message or attach a file.");

    if (file) {
      mediaMutation.mutate({
        to: target.trim(),
        base64: file.dataUrl,
        mimetype: file.mimetype,
        filename: file.name,
        caption: message.trim() || undefined
      });
      return;
    }
    sendMutation.mutate({ to: target.trim(), message: message.trim() });
  };

  const messages = messageData?.messages || [];
  const sending = sendMutation.isPending || mediaMutation.isPending;
  const stateLabel = STATE_LABELS[status?.state] || status?.state || "Loading";

  return (
    <div className="whatsapp-view">
      <section className={`wa-status-card${ready ? " is-ready" : ""}`}>
        <div className="wa-status-main">
          <span className="wa-status-icon" aria-hidden="true">
            <MessageCircle size={22} />
          </span>
          <div>
            <p className="wa-eyebrow">WhatsApp workspace</p>
            <h2>{ready ? status.name || "WhatsApp connected" : "Connect your WhatsApp number"}</h2>
            <p className="wa-status-detail">
              {ready
                ? `Linked as +${status.number || "unknown"} · ${status.queueSize || 0} queued message(s)`
                : "Link the phone once, then send and receive customer messages without leaving the CRM."}
            </p>
          </div>
        </div>
        <div className="wa-status-actions">
          <span className={`wa-state-pill state-${String(status?.state || "").toLowerCase()}`}>
            <span className="wa-state-dot" /> {stateLabel}
          </span>
          {canManage && (
            <>
              <button
                type="button"
                className="btn-ghost-dark small"
                onClick={() => controlMutation.mutate("restart")}
                disabled={controlMutation.isPending}
              >
                <RefreshCw size={14} /> Restart
              </button>
              {ready && (
                <button
                  type="button"
                  className="btn-ghost-dark small"
                  onClick={() => controlMutation.mutate("logout")}
                  disabled={controlMutation.isPending}
                >
                  <LogOut size={14} /> Unlink
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {statusError && (
        <div className="wa-alert" role="alert">
          WhatsApp status could not be loaded: {statusErrorValue?.response?.data?.error || "check the backend connection."}
        </div>
      )}

      {!ready && status?.state !== "DISABLED" && (
        <section className="wa-connect-card">
          <div className="wa-qr-wrap">
            {canManage ? (
              qrData?.qr ? (
                <img src={qrData.qr} alt="WhatsApp device linking QR code" width="240" height="240" />
              ) : (
                <div className="wa-qr-placeholder">
                  <QrCode size={46} />
                  <p>{qrError?.response?.data?.error || "Waiting for the QR code…"}</p>
                  <button type="button" className="btn-ghost-dark small" onClick={() => refetchQr()}>
                    <RefreshCw size={13} /> Retry
                  </button>
                </div>
              )
            ) : (
              <div className="wa-qr-placeholder">
                <Smartphone size={40} />
                <p>An administrator needs to link the WhatsApp number before messages can be sent.</p>
              </div>
            )}
          </div>
          <div className="wa-connect-copy">
            <h3>Link this CRM to WhatsApp</h3>
            <ol>
              <li>Open WhatsApp on the phone that will send messages.</li>
              <li>Go to <strong>Linked devices</strong> and choose <strong>Link a device</strong>.</li>
              <li>Scan the QR code. The page updates when the session is ready.</li>
            </ol>
            <p className="wa-note">
              The session is stored on the server. Only one WhatsApp Web session can use this number at a time.
              Use permission controls to decide who may send.
            </p>
            {status?.lastError && <p className="wa-note error">Last error: {status.lastError}</p>}
          </div>
        </section>
      )}

      <div className="wa-grid">
        <section className="wa-compose-card">
          <div className="wa-card-head">
            <div>
              <p className="wa-eyebrow">Compose</p>
              <h3>New message</h3>
            </div>
            <span className="wa-small-note">Visible to your team</span>
          </div>

          <form onSubmit={handleSend} className="wa-form">
            <label>
              Send to
              <select
                value=""
                disabled={!ready || !canSend}
                onChange={(event) => {
                  const contact = contacts.find((item) => String(item.id) === event.target.value);
                  if (contact?.phone) setTarget(contact.phone);
                }}
              >
                <option value="">Choose a CRM contact…</option>
                {contacts
                  .filter((contact) => contact.phone)
                  .map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} · {contact.phone}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Phone number
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={!ready || !canSend}
                autoComplete="off"
              />
            </label>

            <label>
              Message
              <textarea
                rows={5}
                placeholder="Write a clear, personal message…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={!ready || !canSend}
                maxLength={4000}
              />
            </label>

            <div className="wa-file-row">
              <label className="wa-file-pick">
                <Paperclip size={14} />
                <span>{file ? file.name : "Attach a file"}</span>
                <input type="file" onChange={handleFile} disabled={!ready || !canSend} />
              </label>
              {file?.preview && <img className="wa-file-preview" src={file.preview} alt="Attachment preview" />}
            </div>

            {sendError && <p className="wa-alert" role="alert">{sendError}</p>}
            {!ready && <p className="wa-note">Connect WhatsApp before sending.</p>}
            {ready && !canSend && <p className="wa-note">Your role can view conversations but not send messages.</p>}

            <button
              type="submit"
              className="btn-primary-yellow wa-send-btn"
              disabled={!ready || !canSend || sending}
            >
              {sending ? <RefreshCw className="spin" size={15} /> : <Send size={15} />}
              {sending ? "Sending…" : "Send on WhatsApp"}
            </button>
          </form>
        </section>

        <section className="wa-inbox-card">
          <div className="wa-card-head">
            <div>
              <p className="wa-eyebrow">Conversation log</p>
              <h3>Recent messages</h3>
            </div>
            <span className="wa-small-note">{messageData?.total || 0} logged</span>
          </div>
          <label className="wa-search">
            <MessageCircle size={14} />
            <input
              type="search"
              placeholder="Search message text…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>

          <div className="wa-message-list">
            {loadingMessages && <p className="wa-note">Loading conversation history…</p>}
            {!loadingMessages && messages.length === 0 && (
              <div className="wa-empty">
                <MessageCircle size={28} />
                <p>No WhatsApp messages yet. Once the number is linked, sent and received messages appear here.</p>
              </div>
            )}
            {messages.map((item) => (
              <article
                key={item.id}
                className={`wa-message${item.direction === "Outbound" ? " is-outbound" : ""}`}
              >
                <div className="wa-message-meta">
                  <strong>{item.contact?.name || item.phone || "Unknown number"}</strong>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
                <p>{item.body || (item.media_filename ? `Attachment: ${item.media_filename}` : "Media message")}</p>
                <div className="wa-message-footer">
                  <span>{item.direction === "Outbound" ? "Sent" : "Received"}</span>
                  {item.direction === "Outbound" && (
                    <span className={`wa-delivery ${String(item.status).toLowerCase()}`}>
                      <CheckCheck size={13} /> {item.status}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
