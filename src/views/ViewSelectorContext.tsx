import { createContext, useContext, type ReactNode } from "react";
import { GraphView } from "./types";

type ViewSelectorContextValue = {
  /** View types that can be added. */
  addableTypes: GraphView[];
  /** Append a new instance of the given view type. */
  onAdd: (typeId: string) => void;
  /** Remove an active instance by its unique id. */
  onClose: (instanceId: string) => void;
};

const ViewSelectorContext = createContext<ViewSelectorContextValue | null>(
  null,
);

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
