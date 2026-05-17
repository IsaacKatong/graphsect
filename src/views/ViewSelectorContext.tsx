import { createContext, useContext, type ReactNode } from "react";
import { GraphView } from "./types";

type ViewSelectorContextValue = {
  views: GraphView[];
  activeIds: string[];
  onActiveIdsChange: (next: string[]) => void;
};

const ViewSelectorContext = createContext<ViewSelectorContextValue | null>(null);

export function ViewSelectorProvider({
  value,
  children,
}: {
  value: ViewSelectorContextValue;
  children: ReactNode;
}) {
  return (
    <ViewSelectorContext.Provider value={value}>
      {children}
    </ViewSelectorContext.Provider>
  );
}

export function useViewSelector(): ViewSelectorContextValue | null {
  return useContext(ViewSelectorContext);
}
