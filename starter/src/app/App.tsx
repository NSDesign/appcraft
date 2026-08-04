/**
 * The fixture app.
 *
 * Deliberately small and deliberately *complete*: it renders every archetype, at every
 * scale the kernel claims to cover, so the browser suite can prove retention and
 * eviction rather than argue for them. It is a fixture — it exercises the framework
 * and never sources requirements for it.
 *
 * Styling reads CSS custom properties from `theme.css`, never literals
 * (`theme-tokens-not-literals`). Those tokens are appcraft-owned today; swapping the
 * source to Astryx changes the stylesheet, not this file.
 */
import { useCallback, useMemo, useState } from "react";

import {
  Branch,
  Derived,
  Discriminant,
  ProductOutput,
  ProjectionNode,
  Surface,
  createStore,
  exportActive,
  readActiveBranch,
  select,
  undo,
  write,
  type ProjectionDefinition,
  type ProjectionStore,
} from "@nsdesign/appcraft-core";

import {
  inspectorPanel,
  isBranchValid,
  layerCollection,
  modeField,
  type LayerBranch,
  type ModeBranch,
  type ModeKey,
  type PanelBranch,
} from "./app-schema";

declare global {
  interface Window {
    __appcraftExport?: unknown;
  }
}

/** Seeded from the query string so the performance scenarios can size their workload. */
function seedCounts(): { layers: number; tabs: number } {
  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get("count") ?? "0");
  const seed = params.get("seed");

  return {
    layers: seed === "layers" && Number.isFinite(count) && count > 0 ? count : 4,
    tabs: seed === "tabs" && Number.isFinite(count) && count > 0 ? count : 2,
  };
}

function useProjection<K extends string, S extends object>(
  definition: ProjectionDefinition<K, S>,
): [ProjectionStore<K, S>, (key: K) => void, (patch: Partial<S>) => void, () => void] {
  const [store, setStore] = useState(() => createStore(definition));

  return [
    store,
    useCallback((key: K) => setStore((current) => select(current, key)), []),
    useCallback((patch: Partial<S>) => setStore((current) => write(current, patch)), []),
    useCallback(() => setStore((current) => undo(current)), []),
  ];
}

export function App() {
  const counts = useMemo(seedCounts, []);
  const layerDefinition = useMemo(() => layerCollection(counts.layers), [counts.layers]);
  const panelDefinition = useMemo(() => inspectorPanel(counts.tabs), [counts.tabs]);

  const [mode, selectMode, writeMode, undoMode] = useProjection<ModeKey, ModeBranch>(modeField);
  const [layers, selectLayer] = useProjection<string, LayerBranch>(layerDefinition);
  const [panel, selectPanel] = useProjection<string, PanelBranch>(panelDefinition);

  const activeMode = readActiveBranch(mode);
  const activeLayer = readActiveBranch(layers);
  const activePanel = readActiveBranch(panel);

  // Only the active branch gates the document. A retained invalid range is user data,
  // not an error.
  const valid = isBranchValid(mode.projection.active, activeMode);

  const onExport = useCallback(() => {
    window.__appcraftExport = {
      layer: exportActive(layers),
      mode: exportActive(mode),
    };
  }, [layers, mode]);

  return (
    <main className="ac-app">
      <header className="ac-bar">
        <h1 className="ac-title">Untitled document</h1>
        <button className="ac-btn" onClick={undoMode} type="button">
          Undo
        </button>
        <button className="ac-btn ac-btn-primary" onClick={onExport} type="button">
          Export
        </button>
        <button
          aria-disabled={!valid}
          className="ac-btn"
          data-appcraft-commit
          disabled={!valid}
          type="button"
        >
          Commit
        </button>
      </header>

      {!valid ? (
        <p className="ac-error" data-appcraft-validation-error>
          The active value is not valid.
        </p>
      ) : null}

      <div className="ac-body">
        <Surface archetype="master-detail" id="layers">
          <ProjectionNode path={layerDefinition.path}>
            <Discriminant
              active={layers.projection.active}
              keys={layerDefinition.keys}
              label="Layers"
              onSelect={selectLayer}
            />
            <Branch active branchKey={layers.projection.active}>
              <span className="ac-label">{activeLayer.name}</span>
              {activeLayer.preview ? <Derived field="preview">{activeLayer.preview}</Derived> : null}
            </Branch>
          </ProjectionNode>
        </Surface>

        <Surface archetype="canvas" id="canvas">
          <ProductOutput>{activeLayer.name}</ProductOutput>
        </Surface>

        <Surface archetype="inspector" id="inspector">
          <Surface archetype="tabbed-section" id="inspector-tabs">
            <ProjectionNode path={panelDefinition.path}>
              <Discriminant
                active={panel.projection.active}
                keys={panelDefinition.keys}
                label="Inspector sections"
                onSelect={selectPanel}
              />
              <Branch active branchKey={panel.projection.active}>
                <span className="ac-label">{activePanel.title}</span>
                {activePanel.scroll ? <Derived field="scroll">{activePanel.scroll}</Derived> : null}
              </Branch>
            </ProjectionNode>
          </Surface>

          <ProjectionNode path={modeField.path}>
            <Discriminant
              active={mode.projection.active}
              keys={modeField.keys}
              label="Value mode"
              onSelect={selectMode}
            />
            <Branch active branchKey={mode.projection.active}>
              <input
                aria-label="Value"
                className="ac-input"
                onChange={(event) => writeMode({ entry: event.target.value })}
                value={activeMode.entry}
              />
              {activeMode.formatted ? (
                <Derived field="formatted">{activeMode.formatted}</Derived>
              ) : null}
            </Branch>
          </ProjectionNode>
        </Surface>
      </div>
    </main>
  );
}
