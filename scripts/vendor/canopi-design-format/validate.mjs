// A small JSON Schema reader for the vendored Canopi design format (see README.md): the keywords
// CANOPI_FILE_SCHEMA uses, nothing more. validate(schema, value) returns a list of problems, each a
// JSON pointer and a sentence; [] means the value is valid.
const INTEGER_FORMATS = /^u?int(8|16|32|64)?$/;

function typeOk(type, v) {
  switch (type) {
    case 'null': return v === null;
    case 'boolean': return typeof v === 'boolean';
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'integer': return Number.isInteger(v);
    case 'array': return Array.isArray(v);
    case 'object': return v !== null && typeof v === 'object' && !Array.isArray(v);
    default: throw new Error(`validate.mjs: type ${type} is not read`);
  }
}

export function validate(root, value) {
  const problems = [];
  const resolve = (ref) => {
    if (!ref.startsWith('#/')) throw new Error(`validate.mjs: $ref ${ref} is not read`);
    return ref.slice(2).split('/').reduce((s, k) => s?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], root);
  };
  const check = (schema, v, at, out) => {
    if (schema === true || schema === undefined) return;
    if (schema === false) { out.push(`${at}: not allowed`); return; }
    if (schema.$ref) { const s = resolve(schema.$ref); if (!s) throw new Error(`validate.mjs: ${schema.$ref} not found`); check(s, v, at, out); }
    if (schema.type !== undefined) {
      const types = [].concat(schema.type);
      if (!types.some((t) => typeOk(t, v))) { out.push(`${at}: expected ${types.join(' or ')}, got ${JSON.stringify(v)?.slice(0, 40)}`); return; }
    }
    if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(v)) out.push(`${at}: must be ${JSON.stringify(schema.const)}`);
    if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) out.push(`${at}: must be one of ${JSON.stringify(schema.enum)}`);
    if (typeof v === 'number') {
      if (typeof schema.format === 'string' && INTEGER_FORMATS.test(schema.format) && !Number.isInteger(v)) out.push(`${at}: must be an integer (${schema.format})`);
      if (typeof schema.minimum === 'number' && v < schema.minimum) out.push(`${at}: below ${schema.minimum}`);
      if (typeof schema.maximum === 'number' && v > schema.maximum) out.push(`${at}: above ${schema.maximum}`);
    }
    if (Array.isArray(v) && schema.items) v.forEach((x, i) => check(schema.items, x, `${at}/${i}`, out));
    if (typeOk('object', v)) {
      for (const k of schema.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
      const props = schema.properties ?? {};
      for (const [k, x] of Object.entries(v)) {
        if (k in props) check(props[k], x, `${at}/${k}`, out);
        else if (schema.additionalProperties !== undefined && schema.additionalProperties !== true) check(schema.additionalProperties, x, `${at}/${k}`, out);
      }
    }
    for (const [kw, need] of [['oneOf', 1], ['anyOf', 0]]) {
      if (!schema[kw]) continue;
      const passing = schema[kw].filter((s) => { const o = []; check(s, v, at, o); return o.length === 0; }).length;
      if (need === 1 ? passing !== 1 : passing === 0) out.push(`${at}: matches ${passing} of the ${kw} choices`);
    }
  };
  check(root, value, '', problems);
  return problems;
}
