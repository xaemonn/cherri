'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';

type Dictionary = Record<string, string>;

/** Dynamic phrases (numbers inside) that a plain lookup can't cover. */
const MONTHS: Record<string, string> = {
  Jan: 'जन॰', Feb: 'फ़र॰', Mar: 'मार्च', Apr: 'अप्रैल', May: 'मई', Jun: 'जून', Jul: 'जुलाई', Aug: 'अग॰', Sep: 'सित॰', Oct: 'अक्टू॰', Nov: 'नव॰', Dec: 'दिस॰',
  January: 'जनवरी', February: 'फ़रवरी', March: 'मार्च', April: 'अप्रैल', June: 'जून', July: 'जुलाई', August: 'अगस्त', September: 'सितंबर', October: 'अक्टूबर', November: 'नवंबर', December: 'दिसंबर',
};
const DAYS: Record<string, string> = {
  Mon: 'सोम', Tue: 'मंगल', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि', Sun: 'रवि',
  Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार', Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार', Sunday: 'रविवार',
};
const MONTH_RE = Object.keys(MONTHS).join('|');
const DAY_RE = Object.keys(DAYS).join('|');
/** "Sun, 25 Oct", "15 Oct 2026", "October 2026", "11 Nov – 15 Nov" */
const translateDates = (text: string) =>
  text.replace(new RegExp(`\\b(${DAY_RE})\\b`, 'g'), (d) => DAYS[d] ?? d).replace(new RegExp(`\\b(${MONTH_RE})\\b`, 'g'), (m) => MONTHS[m] ?? m);
const DATE_ONLY = new RegExp(`^(?:(?:${DAY_RE}),? )?(?:\\d{1,2} (?:${MONTH_RE})(?: \\d{4})?|(?:${MONTH_RE}) \\d{4})(?: – (?:\\d{1,2} (?:${MONTH_RE})(?: \\d{4})?))?$`);

const PATTERNS: Array<[RegExp, (...m: string[]) => string]> = [
  [DATE_ONLY, (d) => translateDates(d)],
  [/^(\d+) d (\d+) h left$/i, (_, d, h) => `${d} दिन ${h} घंटे बाकी`],
  [/^(\d+) h (\d+) min left$/i, (_, h, m) => `${h} घंटे ${m} मिनट बाकी`],
  [/^(\d+) h left$/i, (_, h) => `${h} घंटे बाकी`],
  [/^(\d+) h ago$/i, (_, h) => `${h} घंटे पहले`],
  [/^Window closed$/i, () => 'समय सीमा खत्म'],
  [/^peaks: (.+)$/i, (_, p) => `चरम: ${p}`],
  [/^(\d+) questions$/i, (_, n) => `${n} सवाल`],
  [/^(\d+) min ·$/i, (_, n) => `${n} मिनट ·`],
  [/^Cycle day (\d+) of about (\d+)$/i, (_, d, n) => `चक्र का दिन ${d}, लगभग ${n} में से`],
  [/^You are on day (\d+)$/i, (_, d) => `आज आपका दिन ${d} है`],
  [/^(\d+) cycles$/i, (_, n) => `${n} चक्र`],
  [/^± (\d+) days$/i, (_, n) => `± ${n} दिन`],
  [/^(\d+(?:\.\d+)?)% confident, learned from (\d+) of your cycles\.$/i, (_, p, n) => `${p}% भरोसा, आपके ${n} चक्रों से सीखा।`],
  [/^Ovulation ≈ (.+)$/i, (_, d) => `ओव्यूलेशन ≈ ${translateDates(d)}`],
  [/^Cherri estimates day (\d+) from your log$/i, (_, d) => `चेरी आपके लॉग से दिन ${d} का अनुमान लगाती है`],
  [/^in (\d+) days?$/i, (_, n) => `${n} दिनों में`],
  [/^(\d+) days? late$/i, (_, n) => `${n} दिन देर`],
  [/^(\d+) days? ago$/i, (_, n) => `${n} दिन पहले`],
  [/^(\d+) days?$/i, (_, n) => `${n} दिन`],
  [/^(\d+) d$/i, (_, n) => `${n} दिन`],
  [/^Day (\d+)$/i, (_, n) => `दिन ${n}`],
  [/^(\d+)-day streak$/i, (_, n) => `${n}-दिन का सिलसिला`],
  [/^(\d+) alerts?$/i, (_, n) => `${n} सूचनाएँ`],
  [/^(\d+) clash(?:es)? found · View$/i, (_, n) => `${n} टकराव मिले · देखें`],
  [/^Mood saved: (.+)$/i, (_, m) => `मूड सहेजा गया: ${m}`],
  [/^Good (morning|afternoon|evening)(, .+)?$/i, (_, t, name = '') => `${{ morning: 'सुप्रभात', afternoon: 'नमस्ते', evening: 'शुभ संध्या' }[t.toLowerCase() as 'morning']}${name}`],
  [/^Today$/i, () => 'आज'],
  [/^Tomorrow$/i, () => 'कल'],
  [/^Looking at: (.+)$/i, (_, p) => `देख रही है: ${p}`],
];

const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);

/**
 * Hindi for every screen, not just the strings that have translation keys: when Hindi is on,
 * known English UI text on the page is swapped in place (and kept swapped as React updates),
 * and put back exactly when she switches to English.
 */
export function PageTranslator() {
  const { lang } = useLanguage();

  useEffect(() => {
    if (lang !== 'hi') return;
    let dict: Dictionary | null = null;
    let cancelled = false;
    const originals = new Map<Text, string>();
    const attrOriginals = new Map<Element, Map<string, string>>();

    const translate = (text: string): string | null => {
      const core = text.trim();
      if (!core || !/[A-Za-z]/.test(core)) return null;
      const hit = dict![core];
      if (hit) return text.replace(core, hit);
      for (const [re, fn] of PATTERNS) {
        const m = core.match(re);
        if (m) return text.replace(core, fn(...m));
      }
      return null;
    };

    const visitText = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || SKIP.has(parent.tagName) || parent.closest('[data-no-translate],[contenteditable="true"]')) return;
      const current = node.nodeValue ?? '';
      const next = translate(current);
      if (next !== null && next !== current) {
        if (!originals.has(node)) originals.set(node, current);
        node.nodeValue = next;
      }
    };

    const visitAttrs = (el: Element) => {
      for (const attr of ATTRIBUTES) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        const next = translate(value);
        if (next !== null && next !== value) {
          let saved = attrOriginals.get(el);
          if (!saved) attrOriginals.set(el, (saved = new Map()));
          if (!saved.has(attr)) saved.set(attr, value);
          el.setAttribute(attr, next);
        }
      }
    };

    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return visitText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      visitAttrs(root as Element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) visitText(n as Text);
        else visitAttrs(n as Element);
      }
    };

    let queued = new Set<Node>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      const nodes = queued;
      queued = new Set();
      nodes.forEach(walk);
    };
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') queued.add(r.target);
        else if (r.type === 'attributes') queued.add(r.target);
        else r.addedNodes.forEach((n) => queued.add(n));
      }
      if (!frame) frame = requestAnimationFrame(flush);
    });

    void import('@/lib/hi-dictionary.json').then((mod) => {
      if (cancelled) return;
      dict = mod.default as Dictionary;
      walk(document.body);
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES] });
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      // Back to English exactly as React rendered it.
      originals.forEach((text, node) => {
        if (node.isConnected) node.nodeValue = text;
      });
      attrOriginals.forEach((attrs, el) => attrs.forEach((v, a) => el.isConnected && el.setAttribute(a, v)));
    };
  }, [lang]);

  return null;
}
