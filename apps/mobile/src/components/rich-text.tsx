import type { Citation } from '@cherri/shared';
import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';

const body = { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink };

function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <Text key={key} style={{ fontFamily: fonts.bold }}>{part.slice(2, -2)}</Text>;
    if (/^\[\d+\]$/.test(part)) return <Text key={key} style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.ochreDeep }}>{` ${part} `}</Text>;
    return <Fragment key={key}>{part.replace(/\*([^*]+)\*/g, '$1')}</Fragment>;
  });
}

/** Paragraphs, bullet lists, bold and [n] citations: the markdown subset Cherri replies use. */
export function RichText({ text, citations = [] }: { text: string; citations?: Citation[] }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, b) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <View key={b} style={{ gap: 5 }}>
              {lines.map((line, l) => (
                <View key={l} style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={body}>•</Text>
                  <Text style={[body, { flex: 1 }]}>{inline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''), `${b}-${l}`)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={b} style={body}>
            {lines.map((line, l) => (
              <Fragment key={l}>
                {l > 0 && '\n'}
                {inline(line, `${b}-${l}`)}
              </Fragment>
            ))}
          </Text>
        );
      })}
      {citations.length > 0 && (
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft }}>
          {citations.map((c) => `[${c.index}] ${c.title} · ${c.source}`).join('\n')}
        </Text>
      )}
    </View>
  );
}
