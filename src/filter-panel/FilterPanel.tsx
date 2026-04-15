import { useMemo } from "react";
import { ExternalGraph } from "../external-graph/types";
import { FilterState } from "../filtering/types";
import FilterButton from "./FilterButton";
import DimensionRangeFilter from "./DimensionRangeFilter";

type FilterPanelProps = {
  sourceGraph: ExternalGraph;
  filterState: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  onClearAll: () => void;
};

export default function FilterPanel({
  sourceGraph,
  filterState,
  onFilterChange,
  onClearAll,
}: FilterPanelProps) {
  const options = useMemo(() => extractFilterOptions(sourceGraph), [sourceGraph]);

  const hasActiveFilters = Object.values(filterState).some((v) => v !== null);

  return (
    <div style={panelStyle}>
      <FilterButton
        label="Datum Type"
        options={options.datumTypes}
        selected={filterState.datumType?.selectedTypes ?? []}
        onSelectionChange={(selectedTypes) =>
          onFilterChange(
            "datumType",
            selectedTypes.length > 0 ? { selectedTypes } : null,
          )
        }
      />
      <FilterButton
        label="Datum Tags"
        options={options.datumTags}
        selected={filterState.datumTags?.selectedTags ?? []}
        onSelectionChange={(selectedTags) =>
          onFilterChange(
            "datumTags",
            selectedTags.length > 0 ? { selectedTags } : null,
          )
        }
      />
      <FilterButton
        label="Edges"
        options={options.edgeIDs}
        selected={filterState.connectedEdges?.selectedEdgeIDs ?? []}
        onSelectionChange={(selectedEdgeIDs) =>
          onFilterChange(
            "connectedEdges",
            selectedEdgeIDs.length > 0 ? { selectedEdgeIDs } : null,
          )
        }
      />
      <FilterButton
        label="Edge Tags"
        options={options.edgeTags}
        selected={filterState.edgeTags?.selectedTags ?? []}
        onSelectionChange={(selectedTags) =>
          onFilterChange(
            "edgeTags",
            selectedTags.length > 0 ? { selectedTags } : null,
          )
        }
      />
      <FilterButton
        label="Datums"
        options={options.datumIDs}
        selected={filterState.connectedDatums?.selectedDatumIDs ?? []}
        onSelectionChange={(selectedDatumIDs) =>
          onFilterChange(
            "connectedDatums",
            selectedDatumIDs.length > 0 ? { selectedDatumIDs } : null,
          )
        }
      />
      <DimensionRangeFilter
        availableDimensions={options.dimensions}
        filter={filterState.dimensionValues}
        onFilterChange={(filter) => onFilterChange("dimensionValues", filter)}
      />
      {hasActiveFilters && (
        <button onClick={onClearAll} style={clearButtonStyle}>
          Clear All
        </button>
      )}
    </div>
  );
}

type FilterOptions = {
  datumTypes: string[];
  datumTags: string[];
  edgeIDs: string[];
  edgeTags: string[];
  datumIDs: string[];
  dimensions: { name: string; min: number; max: number }[];
};

function extractFilterOptions(graph: ExternalGraph): FilterOptions {
  const datumTypes = [...new Set(graph.datums.map((d) => d.type))].sort();
  const datumTags = [...new Set(graph.datumTags.map((t) => t.name))].sort();
  const edgeIDs = graph.edges
    .map((e) => `${e.fromDatumID}->${e.toDatumID}`)
    .sort();
  const edgeTags = [...new Set(graph.edgeTags.map((t) => t.name))].sort();
  const datumIDs = graph.datums.map((d) => d.id).sort();

  const dimMap = new Map<string, { min: number; max: number }>();
  for (const dim of graph.datumDimensions) {
    const existing = dimMap.get(dim.name);
    if (existing) {
      existing.min = Math.min(existing.min, dim.value);
      existing.max = Math.max(existing.max, dim.value);
    } else {
      dimMap.set(dim.name, { min: dim.value, max: dim.value });
    }
  }
  const dimensions = [...dimMap.entries()]
    .map(([name, range]) => ({ name, ...range }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { datumTypes, datumTags, edgeIDs, edgeTags, datumIDs, dimensions };
}

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  pointerEvents: "auto",
  minWidth: 0,
  flex: "1 1 0",
  marginRight: "12px",
};

const clearButtonStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#94a3b8",
  border: "1px solid #475569",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};
