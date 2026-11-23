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
import type { Team } from "@/lib/teams";
import { CharacterDetails } from "./character-screen";
import { GearEditor } from "./gear-editor";
import { useDashboard } from "./dashboard-state";
import { GameIcon } from "./game-icon";
import { useCatalog } from "./use-catalog";

const OpenCharacter = createContext<
  (character: Character, team?: Team) => void
>(() => undefined);
export const useOpenCharacter = () => useContext(OpenCharacter);

export function CharacterDrawerProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<{ character: Character; team?: Team }>();
  return (
    <OpenCharacter.Provider
      value={(character, team) => setEntry({ character, team })}
    >
      {children}
      {entry && (
        <Drawer
          key={entry.character.id}
          character={entry.character}
          team={entry.team}
          close={() => setEntry(undefined)}
        />
      )}
    </OpenCharacter.Provider>
  );
}

function Drawer({
  character,
  team,
  close,
}: {
  character: Character;
  team?: Team;
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
                    setWhatIf({ original: character, variant, team });
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
        <div className="drawer-layout">
          <div className="drawer-art" data-rarity={character.rarity}>
            <div className="splash-art-image">
              <GameIcon
                src={character.art}
                fallbackSrc={character.icon}
                alt={`${character.name} splash art`}
                size={900}
                eager
              />
            </div>
          </div>
          <CharacterDetails character={variant} team={team} compact />
        </div>
      </div>
    </dialog>
  );
}
