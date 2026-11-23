"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/lib/model";
import { CharacterDetails } from "./character-screen";
import { GearEditor } from "./gear-editor";
import { useDashboard } from "./dashboard-state";
import { useCatalog } from "./use-catalog";

const OpenCharacter = createContext<(character: Character) => void>(
  () => undefined,
);
export const useOpenCharacter = () => useContext(OpenCharacter);

export function CharacterDrawerProvider({ children }: { children: ReactNode }) {
  const [character, open] = useState<Character>();
  return (
    <OpenCharacter.Provider value={open}>
      {children}
      {character && (
        <Drawer
          key={character.id}
          character={character}
          close={() => open(undefined)}
        />
      )}
    </OpenCharacter.Provider>
  );
}

function Drawer({
  character,
  close,
}: {
  character: Character;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, edit] = useState(false);
  const [variant, setVariant] = useState(character);
  const { catalog, failure, retry } = useCatalog(editing);
  const { setWhatIf } = useDashboard();
  const router = useRouter();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  return (
    <dialog
      className="character-drawer"
      ref={dialog}
      aria-label={`${character.name} character details`}
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className="drawer-content">
        <div className="drawer-toolbar input-row">
          <button
            type="button"
            className="quiet"
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            Close details
          </button>
          <button
            type="button"
            className="quiet"
            aria-expanded={editing}
            onClick={() => edit(!editing)}
          >
            Edit build
          </button>
        </div>
        {editing && (
          <section className="panel stack">
            <h2>Edit build</h2>
            {catalog ? (
              <>
                <GearEditor
                  catalog={catalog}
                  character={variant}
                  update={setVariant}
                />
                <button
                  type="button"
                  onClick={() => {
                    setWhatIf({ original: character, variant });
                    dialog.current?.close();
                    router.push("/compare?build=1");
                  }}
                >
                  Compare this build
                </button>
              </>
            ) : (
              <p role="status">
                {failure || "Loading game catalog…"}{" "}
                {failure && (
                  <button type="button" className="quiet" onClick={retry}>
                    Retry
                  </button>
                )}
              </p>
            )}
          </section>
        )}
        <CharacterDetails character={variant} compact />
      </div>
    </dialog>
  );
}
