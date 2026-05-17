import { ExternalGraph } from "../external-graph/types";

/**
 * Connectedness score for each tag in the graph.
 *
 *   score(T) = |datums(T)| + Σ deg(d) for d ∈ datums(T)
 *
 * where deg(d) is the number of edges incident to datum d (counted once per
 * occurrence as either fromDatumID or toDatumID). Tags absent from the graph
 * are absent from the returned map.
 *
 * This is the canonical formula used by both the Tag Mesh layout and the
 * built-in "Most Connected" carousel.
 */
export function computeTagScores(graph: ExternalGraph): Map<string, number> {
  const datumsByTag = new Map<string, Set<string>>();
  for (const { name, datumID } of graph.datumTags) {
    let bucket = datumsByTag.get(name);
    if (!bucket) {
      bucket = new Set();
      datumsByTag.set(name, bucket);
    }
    bucket.add(datumID);
  }

  const degreeByDatum = new Map<string, number>();
  for (const edge of graph.edges) {
    degreeByDatum.set(
      edge.fromDatumID,
      (degreeByDatum.get(edge.fromDatumID) ?? 0) + 1,
    );
    degreeByDatum.set(
      edge.toDatumID,
      (degreeByDatum.get(edge.toDatumID) ?? 0) + 1,
    );
  }

  const scores = new Map<string, number>();
  for (const [tag, datums] of datumsByTag) {
    let s = datums.size;
    for (const d of datums) s += degreeByDatum.get(d) ?? 0;
    scores.set(tag, s);
  }
  return scores;
}
