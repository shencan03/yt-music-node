// @ts-check
/**
 * TypeDoc plugin for the API reference.
 *
 * Endpoint methods are declared with a `this: ClientContext` parameter (they are attached to
 * `YTMusic.prototype`). Callers never pass it, so it is removed from every signature.
 */
import { Converter, ReflectionKind } from "typedoc";

/** @param {import("typedoc").Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_END, (context) => {
    for (const reflection of context.project.getReflectionsByKind(ReflectionKind.CallSignature)) {
      const signature = /** @type {import("typedoc").SignatureReflection} */ (reflection);
      if (signature.parameters?.[0]?.name === "this") {
        context.project.removeReflection(signature.parameters[0]);
        signature.parameters = signature.parameters.filter((p) => p.name !== "this");
      }
    }
  });
}
