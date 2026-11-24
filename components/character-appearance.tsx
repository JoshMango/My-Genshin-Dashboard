"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  readModel,
  removeModel,
  saveModel,
  validateModel,
} from "@/lib/local-models";
import type { Character } from "@/lib/model";
import { GameIcon } from "./game-icon";

export function CharacterAppearance({ character }: { character: Character }) {
  const [model, setModel] = useState<File>();
  const [showModel, setShowModel] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [viewerError, setViewerError] = useState("");
  const viewingModel = model && showModel && !viewerError;

  useEffect(() => {
    let active = true;
    readModel(character.id)
      .then((file) => {
        if (active) setModel(file);
      })
      .catch(() => {
        // Viewers can still open a file for this visit if storage is disabled.
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [character.id]);

  async function load(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(true);
    setNotice("");
    try {
      await validateModel(file);
      try {
        await saveModel(character.id, file);
        setNotice("Model saved in this browser.");
      } catch {
        setNotice(
          "Model opened for this visit. Browser storage is unavailable.",
        );
      }
      setModel(file);
      setViewerError("");
      setShowModel(true);
    } catch (error) {
      setNotice(
        error instanceof SyntaxError
          ? "This file is not a valid GLB."
          : error instanceof Error
            ? error.message
            : "The model could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await removeModel(character.id);
      setModel(undefined);
      setViewerError("");
      setNotice("Local model removed.");
    } catch {
      setNotice("The browser could not remove the saved model.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail-art panel">
      <div className="appearance-stage">
        {viewingModel ? (
          <LocalModelViewer
            file={model}
            character={character.name}
            onFailure={setViewerError}
          />
        ) : (
          <GameIcon
            src={character.art}
            fallbackSrc={character.icon}
            alt={character.name}
            size={760}
            eager
          />
        )}
      </div>
      <div className="appearance-controls">
        <div className="input-row">
          <label className="button quiet model-picker">
            {model ? "Replace 3D model" : "Load 3D model"}
            <input
              className="sr-only"
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={load}
              disabled={!ready || busy}
            />
          </label>
          {model && (
            <>
              <button
                className="quiet"
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowModel(!viewingModel);
                  setViewerError("");
                }}
              >
                {viewingModel ? "Splash art" : "View 3D model"}
              </button>
              <button
                className="quiet"
                type="button"
                onClick={remove}
                disabled={busy}
              >
                Remove model
              </button>
            </>
          )}
        </div>
        <p className="muted appearance-hint" role="status">
          {viewerError ||
            notice ||
            (viewingModel
              ? "Drag to rotate. Pinch or scroll to zoom."
              : "Use a local GLB file for this character.")}
        </p>
      </div>
    </div>
  );
}

function LocalModelViewer({
  file,
  character,
  onFailure,
}: {
  file: File;
  character: string;
  onFailure: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [loadedFile, setLoadedFile] = useState<File>();

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const url = URL.createObjectURL(file);
    const viewer = document.createElement("model-viewer");
    let active = true;
    const failed = () =>
      onFailure(
        "The 3D model could not render. Try another GLB or a browser with WebGL.",
      );
    const loaded = () => setLoadedFile(file);
    viewer.addEventListener("load", loaded);
    viewer.addEventListener("error", failed);
    void import("@google/model-viewer")
      .then(() => {
        if (!active) return;
        viewer.setAttribute("src", url);
        viewer.setAttribute("alt", `${character} 3D model`);
        viewer.setAttribute("camera-controls", "");
        viewer.setAttribute("touch-action", "pan-y");
        viewer.setAttribute("interaction-prompt", "none");
        container.append(viewer);
      })
      .catch(() => {
        if (active) failed();
      });

    return () => {
      active = false;
      viewer.removeEventListener("load", loaded);
      viewer.removeEventListener("error", failed);
      viewer.remove();
      URL.revokeObjectURL(url);
    };
  }, [file, character, onFailure]);

  return (
    <div className="model-viewer-host" ref={host}>
      {loadedFile !== file && (
        <span className="model-loading" role="status">
          Loading 3D model…
        </span>
      )}
    </div>
  );
}
