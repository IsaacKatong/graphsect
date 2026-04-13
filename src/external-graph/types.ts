export type Datum = {
  id: string;
  name: string;
  type: string;
  content: string;
};

export type Edge = {
  fromDatumID: string;
  toDatumID: string;
};

export type DatumTag = {
  name: string;
  datumID: string;
};

export type DatumDimension = {
  name: string;
  datumID: string;
  value: number;
};

export type DatumTagAssociation = {
  childTagName: string;
  parentTagName: string;
  type: string;
};

export type EdgeTag = {
  name: string;
  edgeID: string;
};

export type ExternalGraph = {
  version: number;
  datums: Datum[];
  edges: Edge[];
  datumTags: DatumTag[];
  datumDimensions: DatumDimension[];
  datumTagAssociations: DatumTagAssociation[];
  edgeTags: EdgeTag[];
};
