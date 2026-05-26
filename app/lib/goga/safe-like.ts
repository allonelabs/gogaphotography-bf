/**
 * Build a safe `ilike` pattern for PostgREST `.or()` chains.
 *
 * Beyond the SQL LIKE meta-chars (`%` and `_`), PostgREST also parses
 * commas and parentheses inside `.or()` to separate filter expressions
 * (e.g. `name.ilike.foo,email.ilike.bar` and grouped sub-filters with
 * `and()` / `or()`). If user input contains any of those, it can break
 * out of one filter and inject another. Strip them all to spaces so the
 * value behaves as a plain substring search.
 *
 * The double-quote also has special meaning when wrapping multi-word
 * values, so we strip that too as belt-and-braces.
 */
export function safeLike(input: string): string {
  return `%${input.replace(/[%_(),"]/g, " ")}%`;
}
