import { familyLabel } from "../vis/registry.ts";
import type { Visualization } from "../vis/types.ts";

interface Props {
  open: boolean;
  catalog: Visualization[];
  visId: string;
  presetId: string;
  onClose: () => void;
  onPick: (visId: string, presetId: string) => void;
}

const FAMILIES = ["ambience", "bars-and-waves", "musical-colors"] as const;

export function Catalog({ open, catalog, visId, presetId, onClose, onPick }: Props) {
  return (
    <div className={`catalog ${open ? "is-open" : ""}`} hidden={!open}>
      <div className="catalog-head">
        <div>
          <p className="catalog-kicker">Now Playing</p>
          <h2>Visualizations</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="catalog-body">
        {FAMILIES.map((family) => {
          const items = catalog.filter((v) => v.family === family);
          return (
            <section key={family} className="catalog-family">
              <h3>{familyLabel(family)}</h3>
              <div className="catalog-grid">
                {items.map((vis) => (
                  <article
                    key={vis.id}
                    className={`vis-card ${vis.id === visId ? "is-active" : ""}`}
                  >
                    <header>
                      <h4>{vis.name}</h4>
                      <span>{vis.era}</span>
                    </header>
                    <ul>
                      {vis.presets.map((preset) => (
                        <li key={preset.id}>
                          <button
                            type="button"
                            className={
                              vis.id === visId && preset.id === presetId
                                ? "is-on"
                                : ""
                            }
                            onClick={() => onPick(vis.id, preset.id)}
                          >
                            {preset.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
