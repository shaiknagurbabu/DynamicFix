import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  name: string;
  action?: "delete" | "archive";
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({ name, action = "delete", onCancel, onConfirm }: ConfirmDialogProps) {
  const isArchive = action === "archive";
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-icon"><AlertTriangle size={22} /></div>
        <h2 id="confirm-title">{isArchive ? "Archive this record?" : "Delete this record?"}</h2>
        <p><strong>{name}</strong> {isArchive ? "will be archived and can be restored later." : "will be permanently deleted. This action cannot be undone."}</p>
        <div className="dialog-footer">
          <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className={`button ${isArchive ? "button-primary" : "button-danger"}`} onClick={onConfirm}>{isArchive ? "Archive record" : "Delete record"}</button>
        </div>
      </section>
    </div>
  );
}
