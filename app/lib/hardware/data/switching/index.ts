import meta from "./_meta.json";
import catalyst9500 from "./catalyst-9500.json";
import catalyst9400 from "./catalyst-9400.json";
import catalyst9400Modules from "./catalyst-9400-modules.json";
import catalyst9300 from "./catalyst-9300.json";
import catalyst9200l from "./catalyst-9200.json";
import stackwiseCables from "./stackwise-cables.json";

/**
 * Aggregated switching catalog.
 * Output shape is identical to the previous monolithic switching.json.
 */
export const switchingCatalog = {
  schemaVersion: meta.schemaVersion,
  meta: meta.meta,
  series: {
    ...catalyst9500,
    ...catalyst9400,
    ...catalyst9400Modules,
    ...catalyst9300,
    ...catalyst9200l,
    ...stackwiseCables,
  },
};

export default switchingCatalog;