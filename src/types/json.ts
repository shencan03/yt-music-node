/** A JSON primitive. */
export type JsonPrimitive = string | number | boolean | null;
/** Any JSON value. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
/** A JSON object, e.g. a raw InnerTube response. */
export interface JsonObject {
  [key: string]: JsonValue;
}
/** A JSON array. */
export type JsonArray = JsonValue[];
