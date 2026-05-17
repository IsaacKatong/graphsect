import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Carousel } from "../../carousels/types";
import { DEFAULT_CAROUSELS } from "../../carousels/defaultCarousels";
import { GraphView, GraphViewProps } from "../types";

const TAG_WIDTH = 110;
const TAG_HEIGHT = 36;
const TAG_GAP = 8;
const TAG_PAD_X = 10;
const TAG_PAD_Y = 4;
const BASE_FONT = 14;

type CarouselsViewProps = GraphViewProps & {
  carousels: Carousel[];
};

function CarouselsView({
  sourceGraph,
  filterState,
  onFilterStateChange,
  carousels,
}: CarouselsViewProps) {
  function onTagClick(tag: string) {
    onFilterStateChange({
      ...filterState,
      datumTags: { selectedTags: [tag] },
    });
  }

  // Sections render in the order they're declared in the carousels array.
  const sections = useMemo(
    () =>
      carousels.map((c) => ({
        key: c.name,
        title: c.name,
        tags: c.selection(sourceGraph),
      })),
    [carousels, sourceGraph],
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
                  selected={
                    filterState.datumTags?.selectedTags.length === 1 &&
                    filterState.datumTags.selectedTags[0] === tag
                  }
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
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  // After mount, measure the natural text size against the rectangle's
  // available area and scale down (never up) so the tag fits. The rectangle
  // itself is a fixed pixel size, so this only runs when the tag changes.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.transform = "scale(1)";
    const naturalW = el.scrollWidth;
    const naturalH = el.scrollHeight;
    if (naturalW <= 0 || naturalH <= 0) return;
    const availW = TAG_WIDTH - TAG_PAD_X * 2;
    const availH = TAG_HEIGHT - TAG_PAD_Y * 2;
    const s = Math.min(1, availW / naturalW, availH / naturalH);
    setScale(s);
  }, [tag]);

  return (
    <button
      onClick={onClick}
      style={{
        ...tagBoxStyle,
        ...(selected ? selectedTagBoxStyle : null),
      }}
      title={tag}
    >
      <span
        ref={textRef}
        style={{
          ...tagTextStyle,
          transform: `scale(${scale})`,
        }}
      >
        {tag}
      </span>
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
  width: TAG_WIDTH,
  height: TAG_HEIGHT,
  padding: `${TAG_PAD_Y}px ${TAG_PAD_X}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #334155",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
};

const selectedTagBoxStyle: CSSProperties = {
  background: "#4f46e5",
  borderColor: "#6366f1",
  color: "#ffffff",
};

const tagTextStyle: CSSProperties = {
  display: "inline-block",
  whiteSpace: "nowrap",
  fontSize: BASE_FONT,
  lineHeight: 1.1,
  transformOrigin: "center center",
  pointerEvents: "none",
};

export default CarouselsView;
