import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const interactiveProps = new Set([
  'onClick',
  'onDoubleClick',
  'onPointerDown',
  'onPointerUp',
  'onMouseDown',
  'onMouseUp',
  'onTouchStart',
  'onTouchEnd',
  'onKeyDown',
  'onKeyUp',
  'formAction',
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return /\.tsx$/.test(entry.name) ? [fullPath] : [];
  });
}

function getTagName(node) {
  const text = node.tagName?.getText?.() || '';
  return text.toLowerCase();
}

function attributesFor(node) {
  return node.attributes?.properties || [];
}

function attributeName(attribute) {
  if (!attribute || !ts.isJsxAttribute(attribute)) return null;
  return attribute.name.getText();
}

function literalAttributeValue(attribute) {
  if (!attribute || !ts.isJsxAttribute(attribute)) return null;
  if (!attribute.initializer) return true;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  return null;
}

function visibleText(node, sourceFile) {
  const full = node.getText(sourceFile);
  return full
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

const findings = [];
for (const filePath of walk(srcRoot)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;

    if (opening && getTagName(opening) === 'button') {
      const attributes = attributesFor(opening);
      const names = new Set(attributes.map(attributeName).filter(Boolean));
      const delegated = names.has('data-audit-delegated') || names.has('data-sion-delegated');
      const hasHandler = [...interactiveProps].some((name) => names.has(name));
      const disabled = names.has('disabled');
      const typeAttribute = attributes.find((attribute) => attributeName(attribute) === 'type');
      const typeValue = literalAttributeValue(typeAttribute);
      const formButton = typeValue === 'submit' || typeValue === 'reset';
      const spreadProps = attributes.some(ts.isJsxSpreadAttribute);

      if (!delegated && !hasHandler && !disabled && !formButton && !spreadProps) {
        const position = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
        findings.push({
          file: path.relative(root, filePath).replaceAll('\\', '/'),
          line: position.line + 1,
          text: ts.isJsxElement(node) ? visibleText(node, sourceFile) : '(self-closing button)',
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (findings.length > 0) {
  console.error(`Found ${findings.length} button(s) without an explicit interaction contract:`);
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}${finding.text ? ` — ${finding.text}` : ''}`);
  }
  console.error('Add a handler, make the button disabled/form-driven, or mark intentional delegated handling with data-audit-delegated.');
  process.exit(1);
}

console.log('Interactive button audit passed.');
