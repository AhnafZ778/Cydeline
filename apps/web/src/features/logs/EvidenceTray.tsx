import { X } from "lucide-react";
import { LogRowView } from "../../lib/format";

export function EvidenceTray(props: {
  pinned: string[];
  rowById: Map<string, LogRowView>;
  onOpen: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  return (
    <div className="tray" role="group" aria-label="Pinned evidence" data-testid="evidence-tray">
      <strong>Evidence</strong>
      {props.pinned.length === 0 && <span>Pin the log lines that support your theory. They stay here while you filter.</span>}
      {props.pinned.map((id) => {
        const r = props.rowById.get(id);
        if (!r) return null;
        return (
          <span className="chip chip--removable" key={id}>
            <button type="button" className="chip__open" onClick={() => props.onOpen(id)} title={`${r.time} ${r.method} ${r.path} ${r.status ?? ""}`}>
              {r.rid}
            </button>
            <button type="button" aria-label={`Unpin ${r.rid}`} onClick={() => props.onUnpin(id)}>
              <X className="icon" style={{ width: 12, height: 12 }} />
            </button>
          </span>
        );
      })}
    </div>
  );
}
