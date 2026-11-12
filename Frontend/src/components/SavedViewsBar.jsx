import React, { useEffect, useState } from "react";
import { Bookmark, Loader2, Plus, Trash2 } from "lucide-react";
import { createSavedView, deleteSavedView, getSavedViews } from "../services/api";

export default function SavedViewsBar({ entity, currentQuery = {}, onApply }) {
  const [views, setViews] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getSavedViews(entity);
      setViews(data.views || []);
    } catch {
      setError("Saved views could not be loaded.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give this view a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createSavedView({ name: name.trim(), entity, query: currentQuery, is_shared: shared });
      setName("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "The view could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await deleteSavedView(id);
      await load();
    } catch {
      setError("The view could not be removed.");
    } finally {
      setBusy(false);
    }
  };

  const apply = (view) => {
    try {
      onApply?.(JSON.parse(view.query_json || "{}"));
    } catch {
      onApply?.({});
    }
  };

  return (
    <div className="saved-views-bar">
      <span className="saved-views-label"><Bookmark size={13} aria-hidden="true" /> Saved views</span>
      <div className="saved-views-list">
        {views.length === 0 && <span className="saved-views-empty">Save a filter set to reuse it later.</span>}
        {views.map((view) => (
          <span key={view.id} className={`saved-view-chip${view.is_shared ? " is-shared" : ""}`}>
            <button type="button" onClick={() => apply(view)} title={view.is_shared ? "Shared view" : "Private view"}>
              {view.name}
            </button>
            {view.owned && (
              <button type="button" className="saved-view-delete" aria-label={`Delete saved view ${view.name}`} onClick={() => remove(view.id)} disabled={busy}>
                <Trash2 size={11} />
              </button>
            )}
          </span>
        ))}
        <button type="button" className="saved-view-add" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <Plus size={12} /> Save current
        </button>
      </div>

      {open && (
        <form className="saved-view-form" onSubmit={save}>
          <label>
            <span className="sr-only">View name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="View name" maxLength={120} />
          </label>
          <label className="saved-view-share">
            <input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} />
            Share with team
          </label>
          <button type="submit" className="btn-primary-yellow small" disabled={busy}>
            {busy ? <Loader2 size={13} className="spin" /> : "Save view"}
          </button>
        </form>
      )}
      {error && <span className="saved-views-error" role="alert">{error}</span>}
    </div>
  );
}
