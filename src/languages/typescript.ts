// @ts-nocheck

import { Language, languages } from "../prism";
import "./javascript";

languages.typescript = Language.extend("javascript", {
  "class-name": {
    pattern:
      /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
    lookbehind: true,
    greedy: true,
    inside: null, // see below
  },
  builtin:
    /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/,
});

// The keywords TypeScript adds to JavaScript
languages.typescript.keyword.push(
  /\b(?:abstract|declare|is|keyof|readonly|require)\b/,
  // keywords that have to be followed by an identifier
  /\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
  // This is for `import type *, {}`
  /\btype\b(?=\s*(?:[\{*]|$))/
);

// doesn't work with TS because TS is too complex
delete languages.typescript["parameter"];
delete languages.typescript["literal-property"];

// a version of typescript specifically for highlighting types
const typeInside = Language.extend("typescript", {});
delete typeInside["class-name"];

languages.typescript["class-name"].inside = typeInside;

Language.insertBefore("typescript", "function", {
  decorator: {
    pattern: /@[$\w\xA0-\uFFFF]+/,
    inside: {
      at: {
        pattern: /^@/,
        alias: "operator",
      },
      function: /^[\s\S]+/,
    },
  },
  "generic-function": {
    // e.g. foo<T extends "bar" | "baz">( ...
    pattern:
      /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
    greedy: true,
    inside: {
      function: /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
      generic: {
        pattern: /<[\s\S]+/, // everything after the first <
        alias: "class-name",
        inside: typeInside,
      },
    },
  },
});

languages.ts = languages.typescript;
