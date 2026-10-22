import { Modal, Kbd } from "../../design/ui";
import { SHORTCUTS } from "../../content/guide";

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Keyboard shortcuts"
      onClose={onClose}
      actions={
        <button className="btn btn--primary" onClick={onClose} data-autofocus>
          Done
        </button>
      }
    >
      <dl className="shortcuts">
        {SHORTCUTS.map(([label, keys]) => (
          <div style={{ display: "contents" }} key={label}>
            <dt>{label}</dt>
            <dd>
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
