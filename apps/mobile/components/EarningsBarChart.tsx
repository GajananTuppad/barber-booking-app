import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../constants/theme';

interface EarningsBarChartProps {
  data: { day: string; total: number }[];
  height?: number;
}

const BAR_WIDTH = 8;
const GAP = 4;

/** Lightweight hand-rolled bar chart (react-native-svg, already a project dependency) —
 * avoids pulling in victory-native's @shopify/react-native-skia native dependency chain. */
export function EarningsBarChart({ data, height = 160 }: EarningsBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const width = Math.max(1, data.length) * (BAR_WIDTH + GAP);

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((point, index) => {
          const barHeight = Math.max(1, (point.total / max) * (height - 4));
          return (
            <Rect
              key={point.day}
              x={index * (BAR_WIDTH + GAP)}
              y={height - barHeight}
              width={BAR_WIDTH}
              height={barHeight}
              rx={2}
              fill={colors.gold}
            />
          );
        })}
      </Svg>
    </View>
  );
}
