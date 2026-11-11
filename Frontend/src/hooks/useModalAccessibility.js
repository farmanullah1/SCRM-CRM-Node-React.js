import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Applies accessible dialog behaviour to the currently open SCRM modal.
 * The modal markup is rendered by the workspace, so attributes are applied
 * to the topmost dialog element and removed when it closes.
 */
export default function useModalAccessibility(isOpen, onEscape) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = document.querySelector(".modal-box-circuit");
    if (!dialog) return undefined;

    const previouslyFocused = document.activeElement;
    const heading = dialog.querySelector("h3, h2");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("tabindex", "-1");
    if (heading?.textContent) dialog.setAttribute("aria-label", heading.textContent.trim());

    const focusables = () => Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null
    );

    const first = focusables()[0];
    if (first) first.focus();
    else dialog.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      dialog.removeAttribute("role");
      dialog.removeAttribute("aria-modal");
      dialog.removeAttribute("aria-label");
      dialog.removeAttribute("tabindex");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);
}
