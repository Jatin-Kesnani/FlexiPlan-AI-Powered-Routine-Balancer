import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Platform,
} from "react-native";
import {
  BarChart,
  PieChart,
  ProgressChart,
  LineChart,
} from "react-native-chart-kit";
import { Card, Surface } from "react-native-paper";
import { fetchRoutineAnalytics } from "../../utils/api";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// Interfaces remain the same
interface AnalyticsData {
  completion_analytics: {
    daily_completion_rates: {
      [key: string]: { completed: number; total: number; percentage: number };
    };
    activity_completion_rates: {
      [key: string]: { completed: number; total: number; percentage: number };
    };
    overall_completion_rate: {
      completed: number;
      total: number;
      percentage: number;
    };
    completion_by_activity_type: {
      task: { completed: number; total: number; percentage: number };
      hobby: { completed: number; total: number; percentage: number };
    };
  };
  time_analytics: {
    time_by_day: { [key: string]: number };
    time_by_activity: { [key: string]: number };
    time_by_type: { task: number; hobby: number };
    average_daily_time: number;
  };
  activity_frequency: {
    most_frequent_activities: { activity: string; total_hours: number }[];
    activities_by_day: {
      [key: string]: { activity: string; type: string; duration: number }[];
    };
  };
  weekly_patterns: {
    most_busy_day: string | null;
    least_busy_day: string | null;
    day_with_most_activities: string | null;
    day_with_least_activities: string | null;
  };
  time_balance: {
    task_vs_hobby_ratio: { task: number; hobby: number; ratio: number };
    work_life_balance_score: number;
  };
  consistency_score: {
    average_daily_completion: number;
    most_consistent_day: string | null;
    least_consistent_day: string | null;
  };
  routine_period: {
    start_date: string;
    end_date: string;
  };
}

interface CompletionAnalyticsCardProps {
  data: {
    activityCompletionData: Array<{
      name: string;
      percentage: number;
      legendFontColor: string;
      legendFontSize: number;
    }>;
    completion_analytics: {
      daily_completion_rates: {
        [key: string]: { completed: number; total: number; percentage: number };
      };
      overall_completion_rate: { percentage: number };
      completion_by_activity_type: {
        task: { percentage: number };
        hobby: { percentage: number };
      };
    };
  };
}

// Main Analytics Screen Component
const CompletionAnalyticsScreen = () => {
  const { dark, colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 80],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRoutineAnalytics();
        setAnalyticsData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load analytics data.";
        setError(errorMessage);
        Alert.alert("Error", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const prepareChartData = () => {
    if (!analyticsData) return null;
    const { completion_analytics } = analyticsData;
    const activityCompletionData = Object.entries(
      completion_analytics.activity_completion_rates
    ).map(([activity, data]) => ({
      name: activity.length > 15 ? activity.substring(0, 12) + "..." : activity,
      percentage: parseFloat(data.percentage.toFixed(1)),
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
    return {
      completion_analytics,
      activityCompletionData,
      time_analytics: analyticsData.time_analytics,
      activity_frequency: analyticsData.activity_frequency,
      weekly_patterns: analyticsData.weekly_patterns,
      time_balance: analyticsData.time_balance,
      consistency_score: analyticsData.consistency_score,
    };
  };

  const chartData = prepareChartData();

  const renderHeader = () => {
    return (
      <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
        <LinearGradient
          colors={dark ? ['rgba(197, 110, 50, 1)', 'rgba(197, 110, 50, 1)'] : ['rgba(197, 110, 50, 1)', 'rgba(197, 110, 50, 1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
            <Text style={styles.headerTitle}>Completion Analytics</Text>
            <Text style={styles.headerSubtitle}>Track your routine progress</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: dark ? '#1A202C' : '#F7FAFC' }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {renderHeader()}
      
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.contentContainer}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={dark ? '#6366F1' : '#4F46E5'} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading Analytics...
              </Text>
            </View>
          )}
          
          {error && (
            <View style={styles.centered}>
              <Text style={[styles.errorText, { color: '#F56565' }]}>
                Error: {error}
              </Text>
            </View>
          )}
          
          {!loading && !error && chartData && chartData.completion_analytics && (
            <CompletionAnalyticsCard
              data={{
                completion_analytics: chartData.completion_analytics,
                activityCompletionData: chartData.activityCompletionData,
              }}
            />
          )}
          
          {!loading && !error && (!analyticsData || !chartData) && (
            <View style={styles.centered}>
              <Text style={[styles.noDataText, { color: colors.text }]}>
                No analytics data available.
              </Text>
            </View>
          )}
          
          {/* Stats Summary Cards */}
          {!loading && !error && chartData && (
            <View style={styles.statsCardsContainer}>
              <View style={styles.statsRow}>
                <StatCard 
                  title="Consistency" 
                  value={`${chartData.consistency_score.average_daily_completion.toFixed(1)}%`}
                  icon="📊"
                  color={dark ? '#6366F1' : '#4F46E5'}
                />
                <StatCard 
                  title="Balance" 
                  value={`${chartData.time_balance.work_life_balance_score.toFixed(1)}/10`}
                  icon="⚖️"
                  color={dark ? '#F59E0B' : '#F59E0B'}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard 
                  title="Most Active" 
                  value={chartData.weekly_patterns.most_busy_day || 'N/A'}
                  icon="🔥"
                  color={dark ? '#10B981' : '#059669'}
                />
                <StatCard 
                  title="Avg. Daily Time" 
                  value={`${chartData.time_analytics.average_daily_time.toFixed(1)}h`}
                  icon="⏱️"
                  color={dark ? '#EC4899' : '#DB2777'}
                />
              </View>
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

// Stat Card Component with reduced border
const StatCard = ({ title, value, icon, color }) => {
  const { dark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      delay: Math.random() * 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  
  const animatedStyle = {
    opacity: animatedValue,
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };
  
  return (
    <Animated.View style={[styles.statCard, animatedStyle]}>
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        style={styles.statCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statCardContent}>
          <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
            <Text style={styles.statIcon}>{icon}</Text>
          </View>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statTitle, { color: dark ? '#E2E8F0' : '#2D3748' }]}>{title}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Enhanced CompletionAnalyticsCard Component
const CompletionAnalyticsCard = ({ data }: CompletionAnalyticsCardProps) => {
  const { dark, colors } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const cardEntryAnimation = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef(
    Array(4).fill(null).map(() => new Animated.Value(0))
  ).current;

  // Modern color palette
  const chartPalette = {
    primary: dark ? '#6366F1' : '#4F46E5',
    secondary: dark ? '#EC4899' : '#DB2777',
    tertiary: dark ? '#10B981' : '#059669',
    quaternary: dark ? '#F59E0B' : '#F59E0B',
    quinary: dark ? '#8B5CF6' : '#7C3AED',
    background: dark ? '#1A202C' : '#F7FAFC',
    surface: dark ? '#2D3748' : '#FFFFFF',
    surfaceVariant: dark ? '#4A5568' : '#EDF2F7',
    text: dark ? '#F7FAFC' : '#1A202C',
    textSecondary: dark ? '#A0AEC0' : '#4A5568',
    border: dark ? '#4A5568' : '#E2E8F0',
    shadow: dark ? '#00000080' : '#00000040',
  };

  const chartColors = [
    chartPalette.primary,
    chartPalette.secondary,
    chartPalette.tertiary,
    chartPalette.quaternary,
    chartPalette.quinary,
    '#F472B6', // Pink
    '#34D399', // Emerald
    '#A78BFA', // Purple
    '#FBBF24', // Amber
    '#60A5FA', // Blue
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardEntryAnimation, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...sectionAnimations.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 200 + index * 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const baseChartConfig = {
    backgroundGradientFrom: chartPalette.surface,
    backgroundGradientTo: chartPalette.surface,
    backgroundGradientFromOpacity: 1,
    backgroundGradientToOpacity: 1,
    decimalPlaces: 0,
    color: (opacity = 1, index = 0) => {
      const color = chartColors[index % chartColors.length];
      return color + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : '');
    },
    labelColor: () => chartPalette.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: chartPalette.primary,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
      fill: chartPalette.textSecondary,
    },
    propsForBackgroundLines: {
      strokeDasharray: "5,5",
      stroke: chartPalette.border,
      strokeWidth: 1,
    },
  };

  const ensureAllDays = (dailyData: { [key: string]: { completed: number; total: number; percentage: number } }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const resultData = { ...dailyData };
    days.forEach(day => {
      if (!resultData[day]) {
        resultData[day] = { completed: 0, total: 0, percentage: 0 };
      }
    });
    return resultData;
  };
  
  const sortedDailyCompletionRates = Object.entries(ensureAllDays(data.completion_analytics.daily_completion_rates))
    .sort(([dayA], [dayB]) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
    });

  // Line chart data for trend visualization with improved visibility
  const lineChartData = {
    labels: sortedDailyCompletionRates.map(([day]) => day.substring(0, 3)),
    datasets: [
      {
        data: sortedDailyCompletionRates.map(([, dayData]) => parseFloat(dayData.percentage.toFixed(1))),
        color: () => chartPalette.primary,
        strokeWidth: 3,
      },
      {
        data: sortedDailyCompletionRates.map(() => 80), // Target line
        color: () => chartPalette.quaternary + '80',
        strokeWidth: 2,
        withDots: false,
      },
    ],
    legend: ['Completion', 'Target'],
  };

  // Ensure we have min/max values for the Y axis to make labels visible
  const completionValues = sortedDailyCompletionRates.map(([, dayData]) => parseFloat(dayData.percentage.toFixed(1)));
  const minValue = Math.max(0, Math.min(...completionValues) - 10);
  const maxValue = Math.min(100, Math.max(...completionValues) + 10);

  // Adjusted pie chart data to prevent label collision
  const activityCompletionPieData = data.activityCompletionData.map((item, index) => ({
    ...item,
    percentage: item.percentage,
    color: chartColors[index % chartColors.length],
    legendFontColor: chartPalette.textSecondary,
    legendFontSize: 12,
  }));

  const completionByTypePieData = [
    {
      name: "Tasks",
      percentage: parseFloat(data.completion_analytics.completion_by_activity_type.task.percentage.toFixed(1)),
      color: chartColors[0],
      legendFontColor: chartPalette.textSecondary,
      legendFontSize: 12,
    },
    {
      name: "Hobbies",
      percentage: parseFloat(data.completion_analytics.completion_by_activity_type.hobby.percentage.toFixed(1)),
      color: chartColors[1],
      legendFontColor: chartPalette.textSecondary,
      legendFontSize: 12,
    },
  ].filter(item => item.percentage > 0);

  const overallCompletionPercentage = parseFloat(data.completion_analytics.overall_completion_rate.percentage.toFixed(1));

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return '#F56565'; // Red
    if (percentage < 70) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const progressColor = getProgressColor(overallCompletionPercentage);

  const renderChartSection = (title: string, chartComponent: React.ReactNode, sectionIndex: number) => {
    const animationStyle = {
      opacity: sectionAnimations[sectionIndex],
      transform: [
        {
          translateY: sectionAnimations[sectionIndex].interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
      ],
    };

    return (
      <Animated.View style={[styles.chartSectionContainer, animationStyle]}>
        <Surface style={[styles.chartSectionSurface, {
          backgroundColor: chartPalette.surface,
          borderColor: chartPalette.border,
          borderWidth: 1,
          shadowColor: chartPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.chartSectionHeader}>
            <Text style={[styles.sectionTitle, { color: chartPalette.text }]}>{title}</Text>
          </View>
          <View style={styles.chartContent}>{chartComponent}</View>
        </Surface>
      </Animated.View>
    );
  };

  const chartAvailableWidth = screenWidth - 48;

  return (
    <Animated.View style={[styles.enhancedCard, {
      backgroundColor: 'transparent',
      opacity: cardEntryAnimation,
      transform: [
        {
          translateY: cardEntryAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
        {
          scale: cardEntryAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          }),
        },
      ],
    }]}>
      <View style={[styles.cardContent, {marginTop:20}]}>
        {/* Daily Completion Trend Chart with improved Y-axis labels */}
        {renderChartSection("Daily Completion Trend", (
          <View style={styles.lineChartContainer}>
            <LineChart
              data={lineChartData}
              width={chartAvailableWidth}
              height={220}
              chartConfig={{
                ...baseChartConfig,
                backgroundGradientFrom: chartPalette.surface,
                backgroundGradientTo: chartPalette.surface,
                color: (opacity = 1, index = 0) => index === 0 
                  ? chartPalette.primary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : '')
                  : chartPalette.quaternary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
                strokeWidth: 3,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: chartPalette.primary,
                },
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: '600',
                  fill: chartPalette.textSecondary,
                },
                // Improved Y-axis label visibility
                formatYLabel: (value) => `${value}%`,
                // Ensure Y-axis has enough range to show labels
                min: minValue,
                max: maxValue,
              }}
              bezier
              style={styles.chartStyle}
              withInnerLines={true}
              withOuterLines={true}
              withShadow={false}
              withDots={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              fromZero={false} // Changed to false to allow proper Y-axis scaling
              yAxisSuffix="%"
              yAxisInterval={20}
              segments={4}
              // Increased left padding for Y-axis labels
              yAxisLabel=""
              withVerticalLabels={true}
              verticalLabelRotation={0}
              xLabelsOffset={-5}
              hidePointsAtIndex={[]}
              getDotColor={(dataPoint, dataPointIndex) => {
                return chartPalette.primary;
              }}
            />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: chartPalette.primary }]} />
                <Text style={[styles.legendText, { color: chartPalette.textSecondary }]}>Completion</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: chartPalette.quaternary }]} />
                <Text style={[styles.legendText, { color: chartPalette.textSecondary }]}>Target (80%)</Text>
              </View>
            </View>
          </View>
        ), 0)}

        {/* Overall Completion Rate */}
        {renderChartSection("Overall Completion Rate", (
          <View style={styles.progressChartContainer}>
            <ProgressChart
              data={{ data: [overallCompletionPercentage / 100] }}
              width={chartAvailableWidth - 32}
              height={220}
              strokeWidth={16}
              radius={80}
              chartConfig={{
                ...baseChartConfig,
                backgroundGradientFrom: chartPalette.surface,
                backgroundGradientTo: chartPalette.surface,
                color: () => progressColor,
                strokeWidth: 2,
              }}
              hideLegend
              style={styles.chartStyle}
            />
            <View style={styles.progressTextWrapper}>
              <Text style={[styles.progressPercentageText, { color: progressColor }]}>
                {overallCompletionPercentage}%
              </Text>
              <Text style={[styles.progressLabelText, { color: chartPalette.textSecondary }]}>
                Overall Completion
              </Text>
              <View style={styles.progressStatusContainer}>
                <View style={[styles.progressStatusIndicator, { backgroundColor: progressColor }]} />
                <Text style={[styles.progressStatusText, { color: chartPalette.textSecondary }]}>
                  {overallCompletionPercentage >= 80 ? 'Excellent' : 
                   overallCompletionPercentage >= 60 ? 'Good' : 
                   overallCompletionPercentage >= 40 ? 'Average' : 'Needs Improvement'}
                </Text>
              </View>
            </View>
          </View>
        ), 1)}

        {/* Activity Completion */}
        {activityCompletionPieData.length > 0 && renderChartSection("Activity Completion", (
          <View>
            <PieChart
              data={activityCompletionPieData}
              width={chartAvailableWidth - 32}
              height={220}
              chartConfig={baseChartConfig}
              accessor="percentage"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend={activityCompletionPieData.length <= 5}
              center={[chartAvailableWidth / 4 - 16, 0]}
              avoidFalseZero
              style={styles.chartStyle}
            />
            {activityCompletionPieData.length > 5 && (
              <View style={{marginTop: 16,
    paddingHorizontal: 16,}}>
                {activityCompletionPieData.map((item, index) => (
                  <View key={index} style={{flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,}}>
                    <View style={[{width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,}, { backgroundColor: item.color }]} />
                    <Text style={[{fontSize: 12,
    fontWeight: '500',}, { color: chartPalette.textSecondary }]}>
                      {item.name}: {item.percentage}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ), 2)}

        {/* Completion by Type - Improved layout to avoid label collision */}
        {completionByTypePieData.length > 0 && renderChartSection("Completion by Type", (
          <View style={styles.typeCompletionContainer}>
            <View style={styles.pieChartWrapper}>
              <PieChart
                data={completionByTypePieData}
                width={chartAvailableWidth - 32}
                height={200}
                chartConfig={baseChartConfig}
                accessor="percentage"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
                hasLegend={false} // Disable built-in legend
                center={[(chartAvailableWidth - 32) / 2 - 60, 0]}
                avoidFalseZero
                style={styles.chartStyle}
              />
            </View>
            {/* Custom type comparison with better spacing */}
            <View style={styles.typeComparisonContainer}>
              <View style={styles.typeComparisonItem}>
                <View style={[styles.typeIndicator, { backgroundColor: chartColors[0] }]} />
                <Text style={[styles.typeLabel, { color: chartPalette.textSecondary }]}>Tasks</Text>
                <Text style={[styles.typeValue, { color: chartPalette.text }]}>
                  {parseFloat(data.completion_analytics.completion_by_activity_type.task.percentage.toFixed(1))}%
                </Text>
              </View>
              <View style={styles.typeComparisonDivider} />
              <View style={styles.typeComparisonItem}>
                <View style={[styles.typeIndicator, { backgroundColor: chartColors[1] }]} />
                <Text style={[styles.typeLabel, { color: chartPalette.textSecondary }]}>Hobbies</Text>
                <Text style={[styles.typeValue, { color: chartPalette.text }]}>
                  {parseFloat(data.completion_analytics.completion_by_activity_type.hobby.percentage.toFixed(1))}%
                </Text>
              </View>
            </View>
          </View>
        ), 3)}
      </View>
    </Animated.View>
  );
};

// Enhanced styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollContent: {
    paddingTop: 180,
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    minHeight: 220,
  },
  loadingText: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  noDataText: {
    textAlign: "center",
    marginVertical: 36,
    fontSize: 16,
    fontWeight: '500',
  },
  enhancedCard: {
    marginBottom: 24,
  },
  cardContent: {
    paddingBottom: 0,
  },
  chartSectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  chartSectionSurface: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chartSectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chartContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    // paddingRight: 16,
  },
  progressChartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 220,
  },
  progressTextWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentageText: {
    fontSize: 42,
    fontWeight: '800',
  },
  progressLabelText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  progressStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  progressStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lineChartContainer: {
    width: '100%',
    alignItems: 'center',
    paddingLeft: 10, // Added padding for Y-axis labels
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Custom pie chart styles to avoid label collision
  customPieChartContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pieChartWrapper: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customLegendContainer: {
    width: '50%',
    paddingLeft: 10,
  },
  customLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customLegendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  customLegendTextContainer: {
    flex: 1,
  },
  customLegendName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  customLegendPercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeCompletionContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeComparisonContainer: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  typeComparisonItem: {
    alignItems: 'center',
  },
  typeComparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 10,
  },
  typeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  typeValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsCardsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  // Stat cards with reduced border
  statCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 21 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardGradient: {
    borderRadius: 16,
    padding: 12, // Reduced padding
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40, // Reduced size
    height: 40, // Reduced size
    borderRadius: 10, // Reduced border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Reduced margin
  },
  statIcon: {
    fontSize: 18, // Reduced size
  },
  statTextContainer: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13, // Reduced size
    fontWeight: '500',
    marginBottom: 2, // Reduced margin
  },
  statValue: {
    fontSize: 18, // Reduced size
    fontWeight: '700',
  },
});

export default CompletionAnalyticsScreen;