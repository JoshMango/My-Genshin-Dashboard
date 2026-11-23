import type { Metadata } from "next";
export const metadata: Metadata = { title: "About" };
export default function AboutPage() {
  return (
    <article className="panel prose-panel stack">
      <h1>About</h1>
      <p>
        My Genshin Dashboard is a free fan project for viewing public Genshin
        Impact showcases, planning teams, and comparing builds.
      </p>
      <h2>Credits</h2>
      <ul>
        <li>
          <a href="https://enka.network/">Enka.Network</a> provides public
          showcase data, equipment metadata, and image hosting.
        </li>
        <li>
          <a href="https://github.com/frzyc/genshin-optimizer">
            Genshin Optimizer
          </a>{" "}
          maintains the GOOD inventory format.
        </li>
        <li>
          <a href="https://github.com/theBowja/genshin-db">genshin-db</a>{" "}
          provides supplemental English descriptions for talents,
          constellations, weapons, and sets.
        </li>
        <li>
          <a href="https://github.com/MadeBaruna/paimon-moe">Paimon.moe</a>{" "}
          hosts the element icon files.
        </li>
        <li>
          <a href="https://library.keqingmains.com/combat-mechanics/damage/damage-formula">
            KQM Theorycrafting Library
          </a>{" "}
          documents the combat mechanics used by the estimator.
        </li>
        <li>
          <a href="https://gcsim.app/">gcsim</a> provides full rotation
          simulation and is planned for a later browser integration.
        </li>
      </ul>
      <p>
        Genshin Impact and its game assets belong to HoYoverse. This project is
        unaffiliated with and unendorsed by HoYoverse.
      </p>
      <p>
        <a href="https://github.com/JoshMango/My-Genshin-Dashboard">
          Project source and issue tracker
        </a>
      </p>
    </article>
  );
}
