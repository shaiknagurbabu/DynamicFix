import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";
import type { ErpModule, RecordData } from "../../shared/modules";

interface RecordDialogProps {
  module: ErpModule;
  initialRecord?: RecordData;
  mode: "add" | "edit" | "view";
  onClose: () => void;
  onSave: (record: RecordData) => Promise<void>;
}

export default function RecordDialog({ module, initialRecord, mode, onClose, onSave }: RecordDialogProps) {
  const [values, setValues] = useState<RecordData>(initialRecord ? { ...initialRecord } : {});
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = module.fields.find((field) => field.required && !values[field.key]?.trim());
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    const record: RecordData = {};
    for (const field of module.fields) record[field.key] = values[field.key]?.trim() ?? "";
    if (initialRecord?._archived) record._archived = initialRecord._archived;
    if (initialRecord?._recordId) record._recordId = initialRecord._recordId;
    try {
      await onSave(record);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "The record could not be saved.";
      setError(message);
      console.error("Could not save ERP record.", saveError);
    }
  };

  const title = mode === "add" ? `Add record to ${module.name}` : mode === "edit" ? `Edit ${module.name.toLowerCase()} record` : `${module.name} details`;

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="record-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">{module.name}</span>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            {module.fields.map((field) => {
              const value = values[field.key] ?? "";
              const common = {
                id: `field-${field.key}`,
                value,
                disabled: mode === "view",
                required: mode !== "view" && field.required,
                onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value })),
              };
              return (
                <label key={field.key} className={`form-field ${field.kind === "textarea" ? "form-field-wide" : ""}`}>
                  <span>{field.label}{field.required && mode !== "view" ? <i> *</i> : null}</span>
                  {field.kind === "select" ? (
                    <select {...common}>
                      <option value="">Select {field.label.toLowerCase()}</option>
                      {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.kind === "textarea" ? (
                    <textarea {...common} rows={3} />
                  ) : (
                    <input {...common} type={field.kind ?? "text"} />
                  )}
                </label>
              );
            })}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="dialog-footer">
            <button type="button" className="button button-secondary" onClick={onClose}>{mode === "view" ? "Close" : "Cancel"}</button>
            {mode !== "view" && <button type="submit" className="button button-primary">{mode === "add" ? "Add record" : "Save changes"}</button>}
          </footer>
        </form>
      </section>
    </div>
  );
}
