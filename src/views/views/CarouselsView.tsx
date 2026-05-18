import { useMemo, type CSSProperties } from "react";
import { Carousel } from "../../carousels/types";
import { DEFAULT_CAROUSELS } from "../../carousels/defaultCarousels";
import { GraphView, GraphViewProps } from "../types";

const TAG_HEIGHT = 36;
const TAG_GAP = 8;
const TAG_PAD_X = 12;
const TAG_PAD_Y = 4;
const BASE_FONT = 14;

type CarouselsViewProps = GraphViewProps & {
  carousels: Carousel[];
};

function CarouselsView({
  graph,
  filterState,
  onFilterStateChange,
  carousels,
}: CarouselsViewProps) {
  const selectedTags = filterState.datumTags?.selectedTags ?? [];

  function onTagClick(tag: string) {
    // Toggle membership in the existing datumTags selection — adding when
    // not present, removing when already there. Highlight state and click
    // semantics share the same source of truth (`filterState.datumTags`),
    // so a tag selected anywhere (Filters bar, here, or programmatically)
    // shows up highlighted everywhere.
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onFilterStateChange({
      ...filterState,
      datumTags: next.length > 0 ? { selectedTags: next } : null,
    });
  }

  // Each carousel runs against the filtered graph the ViewManager hands us,
  // so applying a filter re-renders the sections with whatever tags remain
  // in the narrowed-down external graph.
  const sections = useMemo(
    () =>
      carousels.map((c) => ({
        key: c.name,
        title: c.name,
        tags: c.selection(graph),
      })),
    [carousels, graph],
  );

  return (
    <div style={containerStyle}>
      {sections.map((section) => (
        <section key={section.key} style={sectionStyle}>
          <h3 style={titleStyle}>{section.title}</h3>
          {section.tags.length === 0 ? (
            <div style={emptyStyle}>No tags.</div>
          ) : (
            <div style={tagsRowStyle}>
              {section.tags.map((tag) => (
                <CarouselTag
                  key={tag}
                  tag={tag}
                  selected={selectedTags.includes(tag)}
                  onClick={() => onTagClick(tag)}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

type CarouselTagProps = {
  tag: string;
  selected: boolean;
  onClick: () => void;
};

function CarouselTag({ tag, selected, onClick }: CarouselTagProps) {
  // The box sizes to its text content (auto width, fixed height, padded).
  // `whiteSpace: "nowrap"` keeps each tag on a single line and the parent's
  // `flex-wrap: wrap` pushes overflowing tiles to the next row.
  return (
    <button
      onClick={onClick}
      style={{
        ...tagBoxStyle,
        ...(selected ? selectedTagBoxStyle : null),
      }}
      title={tag}
    >
      {tag}
    </button>
  );
}

/**
 * Build a `GraphView` whose body renders the supplied carousels. The default
 * registry (`BUILTIN_VIEWS`) ships one of these for `DEFAULT_CAROUSELS`; pass
 * your own list to override it.
 */
export function createCarouselsView(
  carousels: Carousel[] = DEFAULT_CAROUSELS,
): GraphView {
  return {
    id: "carousels",
    name: "Carousels",
    minHeight: 180,
    Component: (props) => <CarouselsView {...props} carousels={carousels} />,
  };
}

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  padding: "12px 16px",
  overflowY: "auto",
  backgroundColor: "#0f172a",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const emptyStyle: CSSProperties = {
  color: "#64748b",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
};

const tagsRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: TAG_GAP,
};

const tagBoxStyle: CSSProperties = {
  height: TAG_HEIGHT,
  padding: `${TAG_PAD_Y}px ${TAG_PAD_X}px`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1e293b",
  color: "#e2e8f0",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#334155",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  fontSize: BASE_FONT,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

const selectedTagBoxStyle: CSSProperties = {
  background: "#4f46e5",
  borderColor: "#6366f1",
  color: "#ffffff",
};

export default CarouselsView;
