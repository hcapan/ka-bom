"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface PromptOptions {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// ──────────────────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | {
      kind: "prompt";
      opts: PromptOptions;
      resolve: (v: string | null) => void;
    }
  | null;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(null);
  const [inputValue, setInputValue] = useState("");

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(opts.defaultValue ?? "");
      setState({ kind: "prompt", opts, resolve });
    });
  }, []);

  const close = (value: boolean | string | null) => {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(value as boolean);
    else state.resolve(value as string | null);
    setState(null);
    setInputValue("");
  };

  const isDanger =
    state?.kind === "confirm" && state.opts.variant === "danger";

  return (
    <ModalContext.Provider value={{ confirm, prompt }}>
      {children}

      <AnimatePresence>
        {state && (
          <>
            {/* Backdrop */}
            <motion.div
              key="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => close(state.kind === "confirm" ? false : null)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px]"
            />

            {/* Dialog */}
            <motion.div
              key="modal-dialog"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="
                fixed left-1/2 top-1/2 z-[101]
                w-[420px] max-w-[90vw]
                -translate-x-1/2 -translate-y-1/2
                rounded-xl border border-slate-200 bg-white
                shadow-2xl
              "
            >
              <div className="p-5">
                {state.opts.title && (
                  <h2 className="text-sm font-bold text-slate-800">
                    {state.opts.title}
                  </h2>
                )}

                {state.kind === "confirm" && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {state.opts.message}
                  </p>
                )}

                {state.kind === "prompt" && (
                  <>
                    {state.opts.message && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {state.opts.message}
                      </p>
                    )}
                    <input
                      autoFocus
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={state.opts.placeholder}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") close(inputValue);
                        if (e.key === "Escape") close(null);
                      }}
                      className="
                        mt-3 w-full rounded-md border border-slate-300 bg-white
                        px-3 py-2 text-sm
                        focus:border-sky-400 focus:outline-none
                        focus:ring-2 focus:ring-sky-200
                      "
                    />
                  </>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() =>
                      close(state.kind === "confirm" ? false : null)
                    }
                    className="
                      rounded-md border border-slate-300 bg-white
                      px-3 py-1.5 text-xs font-semibold text-slate-700
                      transition-colors hover:bg-slate-50
                    "
                  >
                    {state.opts.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    onClick={() =>
                      close(state.kind === "confirm" ? true : inputValue)
                    }
                    className={`
                      rounded-md px-3 py-1.5 text-xs font-bold text-white
                      transition-colors focus:outline-none focus:ring-2
                      ${
                        isDanger
                          ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-300"
                          : "bg-sky-600 hover:bg-sky-700 focus:ring-sky-300"
                      }
                    `}
                  >
                    {state.opts.confirmLabel ??
                      (state.kind === "confirm" ? "Confirm" : "OK")}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useConfirm must be used within ModalProvider");
  return ctx.confirm;
}

export function usePrompt() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("usePrompt must be used within ModalProvider");
  return ctx.prompt;
}