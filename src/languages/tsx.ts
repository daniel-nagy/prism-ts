// @ts-nocheck

declare function structuredClone<T>(value: T): T;

import { Language, languages } from "../prism";
import "./jsx";
import "./typescript";

var typescript = structuredClone(languages.typescript)!;

languages.tsx = Language.extend("jsx", typescript);

// doesn't work with TS because TS is too complex
delete languages.tsx["parameter"];
delete languages.tsx["literal-property"];

// This will prevent collisions between TSX tags and TS generic types.
// Idea by https://github.com/karlhorky
// Discussion: https://github.com/PrismJS/prism/issues/2594#issuecomment-710666928
var tag = languages.tsx.tag;

tag.pattern = RegExp(
  /(^|[^\w$]|(?=<\/))/.source + "(?:" + tag.pattern.source + ")",
  tag.pattern.flags
);

tag.lookbehind = true;
