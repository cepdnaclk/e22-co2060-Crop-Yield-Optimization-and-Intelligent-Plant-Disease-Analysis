import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import si from '../../i18n/locales/si.json';

const translations = si.auto as Record<string, string>;

const originalTextMap = new WeakMap<Text, string>();

const ignoredTags = new Set([
  'SCRIPT',
  'STYLE',
  'TEXTAREA',
  'INPUT',
  'NOSCRIPT',
  'CODE',
  'PRE',
]);

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function translateText(original: string, language: string) {
  if (!language.startsWith('si')) {
    return original;
  }

  const normalized = normalizeText(original);

  if (!normalized) {
    return original;
  }

  if (translations[normalized]) {
    return original.replace(normalized, translations[normalized]);
  }

  // Handle dynamic greeting like "Welcome, Nipuni"
  if (normalized.startsWith('Welcome,')) {
    return original.replace('Welcome,', 'සාදරයෙන් පිළිගනිමු,');
  }

  // Handle dynamic flood alerts like "SEVERE FLOOD THREAT"
  if (normalized.endsWith('FLOOD THREAT')) {
    return original.replace('FLOOD THREAT', 'ගංවතුර අවදානම');
  }

  // Handle dynamic distance text like "5 km away · Trend: rising"
  if (normalized.includes('km away · Trend:')) {
    return original
      .replace('km away', 'කි.මී. දුරින්')
      .replace('Trend:', 'ප්‍රවණතාව:');
  }

  return original;
}

function walkTextNodes(root: Node, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent || ignoredTags.has(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }

      const text = normalizeText(node.textContent || '');
      if (!text || !/[A-Za-z]/.test(text)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  nodes.forEach((node) => {
    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, node.textContent || '');
    }

    const original = originalTextMap.get(node) || '';
    const translated = translateText(original, language);

    if (node.textContent !== translated) {
      node.textContent = translated;
    }
  });
}

function translateAttributes(root: HTMLElement, language: string) {
  const elements = root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label], [alt]');

  elements.forEach((element) => {
    ['placeholder', 'title', 'aria-label', 'alt'].forEach((attribute) => {
      const currentValue = element.getAttribute(attribute);
      if (!currentValue) return;

      const storageKey = `data-original-${attribute}`;
      if (!element.hasAttribute(storageKey)) {
        element.setAttribute(storageKey, currentValue);
      }

      const originalValue = element.getAttribute(storageKey) || currentValue;
      const translatedValue = translateText(originalValue, language);
      element.setAttribute(attribute, translatedValue);
    });
  });
}

export function FarmerPortalAutoTranslate() {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith('si') ? 'si' : 'en';

  useEffect(() => {
    const root = document.getElementById('farmer-portal-root');
    if (!root) return;

    const translate = () => {
      walkTextNodes(root, language);
      translateAttributes(root, language);
    };

    translate();

    const observer = new MutationObserver(() => {
      translate();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
