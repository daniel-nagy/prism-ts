/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */

declare function structuredClone<T>(value: T): T;

let uniqueId = 0;

// The grammar object for plaintext
const plainTextGrammar = {};

/**
 * A namespace for utility methods.
 *
 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
 * change or disappear at any time.
 *
 * @namespace
 * @memberof Prism
 */
const util = {
  /**
   * Returns the name of the type of the given value.
   *
   * @example
   * type(null)      === 'Null'
   * type(undefined) === 'Undefined'
   * type(123)       === 'Number'
   * type('foo')     === 'String'
   * type(true)      === 'Boolean'
   * type([1, 2])    === 'Array'
   * type({})        === 'Object'
   * type(String)    === 'Function'
   * type(/abc+/)    === 'RegExp'
   */
  type: function (o: any): string {
    return Object.prototype.toString.call(o).slice(8, -1);
  },
  /**
   * Returns a unique number for the given object. Later calls will still return the same number.
   */
  objId: function (obj: Record<string, unknown>): number {
    if (!obj["__id"]) {
      Object.defineProperty(obj, "__id", { value: ++uniqueId });
    }
    return obj["__id"] as number;
  },
};

/**
 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
 *
 * @namespace
 * @memberof Prism
 * @public
 */
const languages = {
  /**
   * The grammar for plain, unformatted text.
   */
  plain: plainTextGrammar,
  plaintext: plainTextGrammar,
  text: plainTextGrammar,
  txt: plainTextGrammar,

  /**
   * Creates a deep copy of the language with the given id and appends the given tokens.
   *
   * If a token in `redef` also appears in the copied language, then the existing token in the copied language
   * will be overwritten at its original position.
   *
   * ## Best practices
   *
   * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
   * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
   * understand the language definition because, normally, the order of tokens matters in Prism grammars.
   *
   * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
   * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
   *
   * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
   * @param {Grammar} redef The new tokens to append.
   * @returns {Grammar} The new language created.
   * @public
   * @example
   * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
   *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
   *     // at its original position
   *     'comment': { ... },
   *     // CSS doesn't have a 'color' token, so this token will be appended
   *     'color': /\b(?:red|green|blue)\b/
   * });
   */
  extend: function (id: string, redef: Grammar): Grammar {
    const lang = structuredClone(languages[id]!);

    for (const key in redef) {
      lang[key] = redef[key];
    }

    return lang;
  },

  /**
   * Inserts tokens Prism.util_before_ another token in a language definition or any other grammar.
   *
   * ## Usage
   *
   * This helper method makes it easy to modify existing languages. For example, the CSS language definition
   * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
   * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
   * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
   * this:
   *
   * ```js
   * Prism.languages.markup.style = {
   *     // token
   * };
   * ```
   *
   * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
   * before existing tokens. For the CSS example above, you would use it like this:
   *
   * ```js
   * Prism.languages.insertBefore('markup', 'cdata', {
   *     'style': {
   *         // token
   *     }
   * });
   * ```
   *
   * ## Special cases
   *
   * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
   * will be ignored.
   *
   * This behavior can be used to insert tokens after `before`:
   *
   * ```js
   * Prism.languages.insertBefore('markup', 'comment', {
   *     'comment': Prism.languages.markup.comment,
   *     // tokens after 'comment'
   * });
   * ```
   *
   * ## Limitations
   *
   * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
   * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
   * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
   * deleting properties which is necessary to insert at arbitrary positions.
   *
   * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
   * Instead, it will create a new object and replace all references to the target object with the new one. This
   * can be done without temporarily deleting properties, so the iteration order is well-defined.
   *
   * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
   * you hold the target object in a variable, then the value of the variable will not change.
   *
   * ```js
   * var oldMarkup = Prism.languages.markup;
   * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
   *
   * assert(oldMarkup !== Prism.languages.markup);
   * assert(newMarkup === Prism.languages.markup);
   * ```
   *
   * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
   * object to be modified.
   * @param {string} before The key to insert before.
   * @param {Grammar} insert An object containing the key-value pairs to be inserted.
   * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
   * object to be modified.
   *
   * Defaults to `Prism.languages`.
   * @returns {Grammar} The new grammar object.
   * @public
   */
  insertBefore: function (
    inside: string,
    before: string,
    insert: Grammar,
    root: Record<string, any>,
  ) {
    root = root || /** @type {any} */ languages;
    const grammar = root[inside];
    /** @type {Grammar} */
    const ret = {};

    for (const token in grammar) {
      if (grammar.hasOwnProperty(token)) {
        if (token == before) {
          for (const newToken in insert) {
            if (insert.hasOwnProperty(newToken)) {
              ret[newToken] = insert[newToken];
            }
          }
        }

        // Do not insert token which also occur in insert. See #1525
        if (!insert.hasOwnProperty(token)) {
          ret[token] = grammar[token];
        }
      }
    }

    const old = root[inside];
    root[inside] = ret;

    // Update references in other language definitions
    languages.DFS(languages, function (key, value) {
      if (value === old && key != inside) {
        this[key] = ret;
      }
    });

    return ret;
  },

  // Traverse a language definition with Depth First Search
  DFS: function DFS(o, callback, type, visited) {
    visited = visited || {};

    const objId = util.objId;

    for (const i in o) {
      if (o.hasOwnProperty(i)) {
        callback.call(o, i, o[i], type || i);

        const property = o[i];
        const propertyType = util.type(property);

        if (propertyType === "Object" && !visited[objId(property)]) {
          visited[objId(property)] = true;
          DFS(property, callback, null, visited);
        } else if (propertyType === "Array" && !visited[objId(property)]) {
          visited[objId(property)] = true;
          DFS(property, callback, i, visited);
        }
      }
    }
  },
};

/**
 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
 * and the language definitions to use, and returns an array with the tokenized code.
 *
 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
 *
 * This method could be useful in other contexts as well, as a very crude parser.
 *
 * @param {string} text A string with the code to be highlighted.
 * @param {Grammar} grammar An object containing the tokens to use.
 *
 * Usually a language definition like `Prism.languages.markup`.
 * @returns {TokenStream} An array of strings and tokens, a token stream.
 * @memberof Prism
 * @public
 * @example
 * let code = `var foo = 0;`;
 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
 * tokens.forEach(token => {
 *     if (token instanceof Prism.Token && token.type === 'number') {
 *         console.log(`Found numeric literal: ${token.content}`);
 *     }
 * });
 */
export function tokenize(text: string, grammar: Grammar): TokenStream {
  const rest = grammar.rest;
  if (rest) {
    for (const token in rest) {
      grammar[token] = rest[token]!;
    }

    delete grammar.rest;
  }

  const tokenList = new LinkedList<string | Token>();
  addAfter(tokenList, tokenList.head, text);

  matchGrammar(text, tokenList, grammar, tokenList.head, 0);

  return toArray(tokenList);
}

/**
 * Creates a new token.
 *
 * @param {string} type See {@link Token#type type}
 * @param {string | TokenStream} content See {@link Token#content content}
 * @param {string|string[]} [alias] The alias(es) of the token.
 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
 * @class
 * @global
 * @public
 */
class Token {
  constructor(
    public type: string,
    public content: string | TokenStream,
    public alias: string | string[] = "",
    matchedString: string = "",
    public length = matchedString.length,
  ) {}
}

/**
 * A token stream is an array of strings and {@link Token Token} objects.
 *
 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
 * them.
 *
 * 1. No adjacent strings.
 * 2. No empty strings.
 *
 * The only exception here is the token stream that only contains the empty string and nothing else.
 */
type TokenStream = Array<string | Token>;

function matchPattern(
  pattern: RegExp,
  pos: number,
  text: string,
  lookbehind: boolean,
): RegExpExecArray | null {
  pattern.lastIndex = pos;
  const match = pattern.exec(text);
  if (match && lookbehind && match[1]) {
    // change the match to remove the text matched by the Prism lookbehind group
    const lookbehindLength = match[1].length;
    match.index += lookbehindLength;
    match[0] = match[0].slice(lookbehindLength);
  }
  return match;
}

type RematchOptions = {
  cause: string;
  reach: number;
};

/**
 * @private
 */
function matchGrammar(
  text: string,
  tokenList: LinkedList<string | Token>,
  grammar: Grammar,
  startNode: LinkedListNode<string | Token>,
  startPos: number,
  rematch?: RematchOptions,
): void {
  for (const token in grammar) {
    if (!grammar.hasOwnProperty(token) || !grammar[token]) {
      continue;
    }

    let patterns = grammar[token]!;
    patterns = Array.isArray(patterns) ? patterns : [patterns];

    for (let j = 0; j < patterns.length; ++j) {
      if (rematch && rematch.cause == token + "," + j) {
        return;
      }

      const patternObj = patterns[j]!;
      const inside = "inside" in patternObj ? patternObj.inside : null;
      const lookbehind = "lookbehind" in patternObj && patternObj.lookbehind;
      const greedy = "greedy" in patternObj && patternObj.greedy;
      const alias = "alias" in patternObj ? patternObj.alias : null;

      if (greedy && !patternObj.pattern.global) {
        // Without the global flag, lastIndex won't work
        const flags =
          patternObj.pattern.toString().match(/[imsuy]*$/)?.[0] ?? "";
        patternObj.pattern = RegExp(patternObj.pattern.source, flags + "g");
      }

      const pattern = "pattern" in patternObj ? patternObj.pattern : patternObj;

      for (
        // iterate the token list and keep track of the current token/string position
        let currentNode = startNode.next, pos = startPos;
        currentNode !== tokenList.tail;
        pos += currentNode?.value?.length ?? 0,
          currentNode = currentNode?.next ?? null
      ) {
        if (rematch && pos >= rematch.reach) {
          break;
        }

        if (currentNode === null || currentNode.value === null) continue;

        let str = currentNode.value;

        if (tokenList.length > text.length) {
          // Something went terribly wrong, ABORT, ABORT!
          return;
        }

        if (str instanceof Token) {
          continue;
        }

        let removeCount = 1; // this is the to parameter of removeBetween
        var match;

        if (greedy) {
          match = matchPattern(pattern, pos, text, lookbehind);
          if (!match || match.index >= text.length) {
            break;
          }

          var from = match.index;
          const to = match.index + match[0].length;
          let p = pos;

          // find the node that contains the match
          p += currentNode.value.length;
          while (from >= p) {
            currentNode = currentNode?.next ?? null;
            p += currentNode?.value?.length ?? 0;
          }
          // adjust pos (and p)
          p -= currentNode?.value?.length ?? 0;
          pos = p;

          // the current node is a Token, then the match starts inside another Token, which is invalid
          if (currentNode?.value instanceof Token) {
            continue;
          }

          // find the last node which is affected by this match
          for (
            let k = currentNode;
            k !== tokenList.tail && (p < to || typeof k?.value === "string");
            k = k?.next ?? null
          ) {
            removeCount++;
            p += k?.value?.length ?? 0;
          }
          removeCount--;

          // replace with the new match
          str = text.slice(pos, p);
          match.index -= pos;
        } else {
          match = matchPattern(pattern, 0, str, lookbehind);
          if (!match) {
            continue;
          }
        }

        // eslint-disable-next-line no-redeclare
        var from = match.index;
        const matchStr = match[0];
        const before = str.slice(0, from);
        const after = str.slice(from + matchStr.length);

        const reach = pos + str.length;
        if (rematch && reach > rematch.reach) {
          rematch.reach = reach;
        }

        let removeFrom = currentNode?.prev ?? null;

        if (removeFrom && before) {
          removeFrom = addAfter(tokenList, removeFrom, before);
          pos += before.length;
        }

        if (removeFrom) removeRange(tokenList, removeFrom, removeCount);

        const wrapped = new Token(
          token,
          inside ? tokenize(matchStr, inside) : matchStr,
          alias ?? "",
          matchStr,
        );

        currentNode = removeFrom && addAfter(tokenList, removeFrom, wrapped);

        if (currentNode && after) {
          addAfter(tokenList, currentNode, after);
        }

        if (removeCount > 1) {
          // at least one Token object was removed, so we have to do some rematching
          // this can only happen if the current pattern is greedy

          const nestedRematch: RematchOptions = {
            cause: token + "," + j,
            reach: reach,
          };
          matchGrammar(
            text,
            tokenList,
            grammar,
            currentNode!.prev!,
            pos,
            nestedRematch,
          );

          // the reach might have been extended because of the rematching
          if (rematch && nestedRematch.reach > rematch.reach) {
            rematch.reach = nestedRematch.reach;
          }
        }
      }
    }
  }
}

type LinkedListNode<T> = {
  next: LinkedListNode<T> | null;
  prev: LinkedListNode<T> | null;
  value: T | null;
};

class LinkedList<T> {
  head: LinkedListNode<T> = { value: null, prev: null, next: null };
  tail: LinkedListNode<T> = { value: null, prev: this.head, next: null };
  length = 0;
}

/**
 * Adds a new node with the given value to the list.
 */
function addAfter<T>(
  list: LinkedList<T>,
  node: LinkedListNode<T>,
  value: T,
): LinkedListNode<T> {
  // assumes that node != list.tail && values.length >= 0
  const next = node.next;

  const newNode = { value: value, prev: node, next: next };
  node.next = newNode;
  if (next) next.prev = newNode;
  list.length++;

  return newNode;
}

/**
 * Removes `count` nodes after the given node. The given node will not be removed.
 */
function removeRange<T>(
  list: LinkedList<T>,
  node: LinkedListNode<T>,
  count: number,
) {
  let next = node.next;
  for (var i = 0; i < count && next !== list.tail; i++) {
    next = next?.next ?? null;
  }
  node.next = next;
  if (next) next.prev = node;
  list.length -= i;
}

function toArray<T>(list: LinkedList<T | null>): T[] {
  const array: T[] = [];
  let node = list.head.next;
  while (node !== list.tail) {
    node?.value && array.push(node.value);
    node = node?.next ?? null;
  }
  return array;
}

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */
type GrammarToken = {
  alias: string | string[];
  greedy: boolean;
  inside: Grammar;
  lookbehind: boolean;
  pattern: RegExp;
};

type Grammar = Record<
  string,
  RegExp | GrammarToken | Array<RegExp | GrammarToken>
> & {
  rest?: Grammar;
};
