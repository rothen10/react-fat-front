/**
 * Arrière-plan décoratif : halos abstraits en dérive lente et voile texturé.
 * Purement présentiel, ne capte aucun clic.
 */
export function FondAnime() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="orbe orbe-a" />
      <span className="orbe orbe-b" />
      <span className="orbe orbe-c" />
      <span className="voile-grille" />
    </div>
  );
}
