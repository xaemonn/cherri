import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/** Two smiling cherries. Blush is tangerine, never pink. */
export function CherryMark({ size = 40, wink = false }: { size?: number; wink?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M33 9C30 21 23 29 20 39M33 9c3 11 7 19 11 27" fill="none" stroke="#4A2C1D" strokeWidth={3} strokeLinecap="round" />
      <Path d="M33 9c6-6 16-5 21 1-8 5-16 4-21-1Z" fill="#B5D866" stroke="#2B1B12" strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={19} cy={45} r={12} fill="#E2453B" stroke="#2B1B12" strokeWidth={2.5} />
      <Circle cx={45} cy={43} r={12} fill="#E2453B" stroke="#2B1B12" strokeWidth={2.5} />
      <Ellipse cx={14.5} cy={40} rx={3} ry={2} fill="#fff" opacity={0.7} />
      <Ellipse cx={40.5} cy={38} rx={3} ry={2} fill="#fff" opacity={0.7} />
      <Circle cx={15.5} cy={46} r={1.4} fill="#2B1B12" />
      <Circle cx={22.5} cy={46} r={1.4} fill="#2B1B12" />
      <Path d="M16.5 49.5q2.5 2.2 5 0" fill="none" stroke="#2B1B12" strokeWidth={1.4} strokeLinecap="round" />
      {wink ? <Path d="M40 43.5h3" stroke="#2B1B12" strokeWidth={1.4} strokeLinecap="round" /> : <Circle cx={41.5} cy={44} r={1.4} fill="#2B1B12" />}
      <Circle cx={48.5} cy={44} r={1.4} fill="#2B1B12" />
      <Path d="M42.5 47.5q2.5 2.2 5 0" fill="none" stroke="#2B1B12" strokeWidth={1.4} strokeLinecap="round" />
      <Ellipse cx={12.5} cy={49} rx={2} ry={1.2} fill="#FF9F43" opacity={0.55} />
      <Ellipse cx={25.5} cy={49} rx={2} ry={1.2} fill="#FF9F43" opacity={0.55} />
      <Ellipse cx={38.5} cy={47} rx={2} ry={1.2} fill="#FF9F43" opacity={0.55} />
      <Ellipse cx={51.5} cy={47} rx={2} ry={1.2} fill="#FF9F43" opacity={0.55} />
    </Svg>
  );
}
