import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const readingRoomEnhancements = fs.readFileSync(path.join(srcRoot, 'readingRoomEnhancements.ts'), 'utf8');
const readingRoomHelp = fs.readFileSync(path.join(srcRoot, 'readingRoomHelp.ts'), 'utf8');
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

function enclosingFunctionName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
    current = current.parent;
  }
  return '';
}

function hasVerifiedDelegatedContract({ file, nodeText, label, functionName }) {
  if (file !== 'src/components/reading-room/ReadingRoomReferencePage.tsx') return false;

  const reflectionContract = label.includes('묵상하기')
    && readingRoomEnhancements.includes("normalizeText(target.textContent).includes('묵상하기')")
    && readingRoomEnhancements.includes('openReflectionModal();');

  const rewardContract = functionName === 'StoreItem'
    && readingRoomEnhancements.includes('target.dataset.sionRewardItem')
    && readingRoomEnhancements.includes('saveRewardState(next);');

  const helpContract = nodeText.includes('CircleHelp')
    && readingRoomHelp.includes('isHelpButton(button)')
    && readingRoomHelp.includes('openHelp();');

  return reflectionContract || rewardContract || helpContract;
}

const findings = [];
const delegatedFindings = [];
for (const filePath of walk(srcRoot)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const relativeFile = path.relative(root, filePath).replaceAll('\\', '/');

  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;

    if (opening && getTagName(opening) === 'button') {
      const attributes = attributesFor(opening);
      const names = new Set(attributes.map(attributeName).filter(Boolean));
      const explicitDelegated = names.has('data-audit-delegated') || names.has('data-sion-delegated');
      const hasHandler = [...interactiveProps].some((name) => names.has(name));
      const disabled = names.has('disabled');
      const typeAttribute = attributes.find((attribute) => attributeName(attribute) === 'type');
      const typeValue = literalAttributeValue(typeAttribute);
      const formButton = typeValue === 'submit' || typeValue === 'reset';
      const spreadProps = attributes.some(ts.isJsxSpreadAttribute);
      const nodeText = node.getText(sourceFile);
      const label = ts.isJsxElement(node) ? visibleText(node, sourceFile) : '(self-closing button)';
      const functionName = enclosingFunctionName(node);
      const verifiedDelegated = hasVerifiedDelegatedContract({
        file: relativeFile,
        nodeText,
        label,
        functionName,
      });

      if (verifiedDelegated) {
        const position = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
        delegatedFindings.push(`${relativeFile}:${position.line + 1}${functionName ? ` (${functionName})` : ''}`);
      }

      if (!explicitDelegated && !verifiedDelegated && !hasHandler && !disabled && !formButton && !spreadProps) {
        const position = sourceFile.getLineAndCharacterOfPosition(opening.getStart(sourceFile));
        findings.push({
          file: relativeFile,
          line: position.line + 1,
          text: label,
          functionName,
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const contract of delegatedFindings) {
  console.log(`✓ verified delegated interaction: ${contract}`);
}

if (findings.length > 0) {
  console.error(`Found ${findings.length} button(s) without an explicit interaction contract:`);
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line}${finding.functionName ? ` (${finding.functionName})` : ''}${finding.text ? ` — ${finding.text}` : ''}`);
  }
  console.error('Add a handler, make the button disabled/form-driven, or provide a verifiable delegated interaction contract.');
  process.exit(1);
}

console.log('Interactive button audit passed.');
