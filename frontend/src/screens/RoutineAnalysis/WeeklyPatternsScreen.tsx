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
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  BarChart,
  LineChart,
  ProgressChart,
  ContributionGraph,
} from "react-native-chart-kit";
import { Card, Surface, Divider } from "react-native-paper";
import { fetchRoutineAnalytics } from "../../utils/api";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Svg, Circle, Rect, Line, G, Text as SvgText } from "react-native-svg";

// Define interfaces
interface LineChartDataset {
  data: number[];
  color?: (opacity: number) => string;
  strokeWidth?: number;
}

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

const WeeklyPatternsScreen = () => {
  const { dark, colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("patterns");
  const screenWidth = Dimensions.get("window").width;
  
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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const cardAnimations = useRef(Array(4).fill(0).map(() => new Animated.Value(0))).current;
  const chartAnimations = useRef(Array(3).fill(0).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      ...cardAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 300 + (index * 150),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ),
      ...chartAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 600 + (index * 200),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ]).start();
  }, [loading]);

  const colorPalette = {
    primary: dark ? '#6366F1' : '#4F46E5', // Indigo
    secondary: dark ? '#EC4899' : '#DB2777', // Pink
    tertiary: dark ? '#10B981' : '#059669', // Green
    quaternary: dark ? '#F59E0B' : '#F59E0B', // Amber
    quinary: dark ? '#8B5CF6' : '#7C3AED', // Purple
    background: dark ? '#1A202C' : '#F7FAFC',
    surface: dark ? '#2D3748' : '#FFFFFF',
    surfaceVariant: dark ? '#4A5568' : '#EDF2F7',
    text: dark ? '#F7FAFC' : '#1A202C',
    textSecondary: dark ? '#A0AEC0' : '#4A5568',
    border: dark ? '#4A5568' : '#E2E8F0',
    shadow: dark ? '#00000080' : '#00000040',
  };

  const chartColors = [
    colorPalette.primary,
    colorPalette.secondary,
    colorPalette.tertiary,
    colorPalette.quaternary,
    colorPalette.quinary,
    '#F472B6', // Pink
    '#34D399', // Emerald
    '#A78BFA', // Purple
    '#FBBF24', // Amber
    '#60A5FA', // Blue
  ];

  const chartConfig = {
    backgroundColor: colorPalette.surface,
    backgroundGradientFrom: colorPalette.surface,
    backgroundGradientTo: colorPalette.surface,
    decimalPlaces: 1,
    color: (opacity = 1, index = 0) => {
      const color = chartColors[index % chartColors.length];
      return color + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : '');
    },
    labelColor: () => colorPalette.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: colorPalette.primary,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
      fill: colorPalette.textSecondary,
    },
    propsForBackgroundLines: {
      strokeDasharray: "5,5",
      stroke: colorPalette.border,
      strokeWidth: 1,
    },
    barPercentage: 0.7,
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRoutineAnalytics();
        setAnalyticsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics data.");
        Alert.alert("Error", err.message || "Failed to fetch analytics data");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const sortDays = (daysObject: { [key: string]: any }): [string, any][] => {
    const dayOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return Object.entries(daysObject).sort(([dayA], [dayB]) => {
      return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB);
    });
  };

  // Prepare data for charts
  const prepareChartData = () => {
    if (!analyticsData) return null;

    const {
      completion_analytics,
      time_analytics,
      activity_frequency,
      weekly_patterns,
      time_balance,
      consistency_score,
    } = analyticsData;

    // Daily completion rates data
    const sortedDailyCompletion = sortDays(completion_analytics.daily_completion_rates);
    const dailyCompletionData = {
      labels: sortedDailyCompletion.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedDailyCompletion.map(([, data]) => data.percentage),
          color: (opacity = 1) => colorPalette.primary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Time by day data
    const sortedTimeByDay = sortDays(time_analytics.time_by_day);
    const timeByDayData = {
      labels: sortedTimeByDay.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedTimeByDay.map(([, hours]) => hours),
          color: (opacity = 1) => colorPalette.tertiary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Activities by day data
    const activitiesByDayData = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
            const activities = activity_frequency.activities_by_day[day] || [];
            return activities.length;
          }),
          color: (opacity = 1) => colorPalette.secondary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Consistency by day data
    const consistencyByDayData = {
      labels: sortedDailyCompletion.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedDailyCompletion.map(([, data]) => data.completed / (data.total || 1) * 100),
          color: (opacity = 1) => colorPalette.quinary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Day ranking data
    const dayRankingData = [
      { day: "Monday", value: sortedTimeByDay.find(([day]) => day === "Monday")?.[1] || 0 },
      { day: "Tuesday", value: sortedTimeByDay.find(([day]) => day === "Tuesday")?.[1] || 0 },
      { day: "Wednesday", value: sortedTimeByDay.find(([day]) => day === "Wednesday")?.[1] || 0 },
      { day: "Thursday", value: sortedTimeByDay.find(([day]) => day === "Thursday")?.[1] || 0 },
      { day: "Friday", value: sortedTimeByDay.find(([day]) => day === "Friday")?.[1] || 0 },
      { day: "Saturday", value: sortedTimeByDay.find(([day]) => day === "Saturday")?.[1] || 0 },
      { day: "Sunday", value: sortedTimeByDay.find(([day]) => day === "Sunday")?.[1] || 0 },
    ].sort((a, b) => b.value - a.value);

    return {
      dailyCompletionData,
      timeByDayData,
      activitiesByDayData,
      consistencyByDayData,
      dayRankingData,
      weekly_patterns,
      time_balance,
      consistency_score,
      completion_analytics,
      time_analytics,
      activity_frequency,
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
            <Text style={styles.headerTitle}>Weekly Patterns</Text>
            <Text style={styles.headerSubtitle}>Discover your weekly activity trends</Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderTabSelector = () => {
    return (
      <View style={styles.tabSelectorContainer}>
        <View style={[styles.tabSelectorContent, { backgroundColor: colorPalette.surfaceVariant, marginTop:20 }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "patterns" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("patterns")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "patterns" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Patterns
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "charts" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("charts")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "charts" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Charts
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPatternCard = (title: string, value: string | null, icon: string, color: string, index: number) => {
    const animationStyle = {
      opacity: cardAnimations[index % cardAnimations.length],
      transform: [
        {
          translateY: cardAnimations[index % cardAnimations.length].interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
      ],
    };

    return (
      <Animated.View style={[styles.patternCardContainer, animationStyle]}>
        <Surface style={[styles.patternCard, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <LinearGradient
            colors={[`${color}15`, `${color}05`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.patternCardGradient}
          >
            <View style={styles.patternCardHeader}>
              <View style={[styles.patternCardIcon, { backgroundColor: `${color}20` }]}>
                <Text style={styles.patternCardIconText}>{icon}</Text>
              </View>
              <Text style={[styles.patternCardTitle, { color: colorPalette.textSecondary }]}>{title}</Text>
            </View>
            <Text style={[styles.patternCardValue, { color }]}>{value || 'N/A'}</Text>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderChartSection = (title: string, chartComponent: React.ReactNode, index: number) => {
    const animationStyle = {
      opacity: chartAnimations[index % chartAnimations.length],
      transform: [
        {
          translateY: chartAnimations[index % chartAnimations.length].interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        },
      ],
    };

    return (
      <Animated.View style={[styles.chartSectionContainer, animationStyle]}>
        <Surface style={[styles.chartSectionSurface, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.chartSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>{title}</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.chartContent}>{chartComponent}</View>
        </Surface>
      </Animated.View>
    );
  };

  const renderTimeByDayChart = () => {
    if (!chartData) return null;
    
    const timeValues = Object.values(chartData.timeByDayData.datasets[0].data);
    const minValue = Math.max(0, Math.min(...timeValues) - 0.5);
    const maxValue = Math.min(24, Math.max(...timeValues) + 0.5);
    
    return (
      <View style={styles.lineChartContainer}>
        <LineChart
          data={chartData.timeByDayData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel=""
          yAxisSuffix="h"
          chartConfig={{
            ...chartConfig,
            formatYLabel: (value) => `${value}h`,
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
          fromZero={false}
          segments={4}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colorPalette.tertiary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Hours Spent</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActivitiesByDayChart = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.lineChartContainer}>
        <LineChart
          data={chartData.activitiesByDayData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel=""
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => colorPalette.secondary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          }}
          bezier
          style={styles.chartStyle}
          withInnerLines={true}
          withOuterLines={true}
          withShadow={false}
          withDots={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          fromZero
          segments={4}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colorPalette.secondary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Number of Activities</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderConsistencyByDayChart = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.lineChartContainer}>
        <LineChart
          data={chartData.consistencyByDayData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => colorPalette.quinary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          }}
          bezier
          style={styles.chartStyle}
          withInnerLines={true}
          withOuterLines={true}
          withShadow={false}
          withDots={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          fromZero
          segments={4}
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colorPalette.quinary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Consistency Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDayRanking = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.dayRankingContainer}>
        {chartData.dayRankingData.map((day, index) => (
          <View 
            key={day.day} 
            style={[
              styles.dayRankingItem,
              { backgroundColor: index === 0 ? `${colorPalette.primary}15` : 'transparent' }
            ]}
          >
            <Text style={[styles.dayRankingPosition, { color: colorPalette.textSecondary }]}>
              #{index + 1}
            </Text>
            <Text style={[styles.dayRankingDay, { color: colorPalette.text }]}>
              {day.day}
            </Text>
            <Text style={[styles.dayRankingValue, { color: colorPalette.primary }]}>
              {day.value.toFixed(1)}h
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyCalendar = () => {
    if (!chartData) return null;
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mostBusyDay = chartData.weekly_patterns.most_busy_day;
    const leastBusyDay = chartData.weekly_patterns.least_busy_day;
    const dayWithMostActivities = chartData.weekly_patterns.day_with_most_activities;
    const dayWithLeastActivities = chartData.weekly_patterns.day_with_least_activities;
    
    return (
      <View style={styles.weeklyCalendarContainer}>
        {days.map(day => {
          let statusColor = colorPalette.textSecondary;
          let statusText = "";
          let statusBgColor = "transparent";
          
          if (day === mostBusyDay) {
            statusColor = colorPalette.primary;
            statusText = "Most Busy";
            statusBgColor = `${colorPalette.primary}15`;
          } else if (day === leastBusyDay) {
            statusColor = colorPalette.quaternary;
            statusText = "Least Busy";
            statusBgColor = `${colorPalette.quaternary}15`;
          } else if (day === dayWithMostActivities) {
            statusColor = colorPalette.tertiary;
            statusText = "Most Activities";
            statusBgColor = `${colorPalette.tertiary}15`;
          } else if (day === dayWithLeastActivities) {
            statusColor = colorPalette.secondary;
            statusText = "Least Activities";
            statusBgColor = `${colorPalette.secondary}15`;
          }
          
          return (
            <View 
              key={day} 
              style={[
                styles.calendarDay,
                { 
                  backgroundColor: statusBgColor,
                  borderColor: colorPalette.border,
                }
              ]}
            >
              <Text style={[styles.calendarDayName, { color: colorPalette.text }]}>
                {day}
              </Text>
              {statusText && (
                <View style={[styles.calendarDayStatus, { backgroundColor: `${statusColor}30` }]}>
                  <Text style={[styles.calendarDayStatusText, { color: statusColor }]}>
                    {statusText}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderWeekVisualizer = () => {
    if (!chartData) return null;
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mostBusyDay = chartData.weekly_patterns.most_busy_day;
    const leastBusyDay = chartData.weekly_patterns.least_busy_day;
    const dayWithMostActivities = chartData.weekly_patterns.day_with_most_activities;
    const dayWithLeastActivities = chartData.weekly_patterns.day_with_least_activities;
    
    const width = screenWidth - 64;
    const height = 180;
    const dayWidth = width / 7;
    const padding = 10;
    
    return (
      <View style={styles.weekVisualizerContainer}>
        <Svg width={width} height={height}>
          {/* Background grid */}
          {days.map((day, i) => (
            <G key={`grid-${day}`}>
              <Line
                x1={i * dayWidth}
                y1={0}
                x2={i * dayWidth}
                y2={height}
                stroke={colorPalette.border}
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </G>
          ))}
          
          {/* Day circles */}
          {days.map((day, i) => {
            let fillColor = colorPalette.surfaceVariant;
            let textColor = colorPalette.textSecondary;
            let radius = 25;
            
            if (day === mostBusyDay) {
              fillColor = colorPalette.primary;
              textColor = "#FFFFFF";
              radius = 35;
            } else if (day === leastBusyDay) {
              fillColor = colorPalette.quaternary;
              textColor = "#FFFFFF";
              radius = 20;
            } else if (day === dayWithMostActivities) {
              fillColor = colorPalette.tertiary;
              textColor = "#FFFFFF";
              radius = 30;
            } else if (day === dayWithLeastActivities) {
              fillColor = colorPalette.secondary;
              textColor = "#FFFFFF";
              radius = 22;
            }
            
            return (
              <G key={`day-${day}`}>
                <Circle
                  cx={i * dayWidth + dayWidth / 2}
                  cy={height / 2}
                  r={radius}
                  fill={fillColor}
                />
                <SvgText
                  x={i * dayWidth + dayWidth / 2}
                  y={height / 2 + 5}
                  fill={textColor}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {day.substring(0, 3)}
                </SvgText>
              </G>
            );
          })}
          
          {/* Legend */}
          <G>
            <Circle cx={width * 0.25} cy={height - 20} r={8} fill={colorPalette.primary} />
            <SvgText x={width * 0.25 + 12} y={height - 16} fill={colorPalette.textSecondary} fontSize="10">
              Most Busy
            </SvgText>
            
            <Circle cx={width * 0.5} cy={height - 20} r={8} fill={colorPalette.tertiary} />
            <SvgText x={width * 0.5 + 12} y={height - 16} fill={colorPalette.textSecondary} fontSize="10">
              Most Activities
            </SvgText>
            
            <Circle cx={width * 0.75} cy={height - 20} r={8} fill={colorPalette.secondary} />
            <SvgText x={width * 0.75 + 12} y={height - 16} fill={colorPalette.textSecondary} fontSize="10">
              Least Activities
            </SvgText>
          </G>
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colorPalette.background }]}>
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
        <Animated.View 
          style={[
            styles.contentContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {renderTabSelector()}
          
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colorPalette.primary} />
              <Text style={[styles.loadingText, { color: colorPalette.text }]}>
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
          
          {!loading && !error && chartData && activeTab === "patterns" && (
            <>
              <View style={styles.patternCardsContainer}>
                <View style={styles.patternCardsRow}>
                  {renderPatternCard(
                    "Most Busy Day",
                    chartData.weekly_patterns.most_busy_day,
                    "🔥",
                    colorPalette.primary,
                    0
                  )}
                  {renderPatternCard(
                    "Least Busy Day",
                    chartData.weekly_patterns.least_busy_day,
                    "🌙",
                    colorPalette.quaternary,
                    1
                  )}
                </View>
                <View style={styles.patternCardsRow}>
                  {renderPatternCard(
                    "Most Activities",
                    chartData.weekly_patterns.day_with_most_activities,
                    "📊",
                    colorPalette.tertiary,
                    2
                  )}
                  {renderPatternCard(
                    "Least Activities",
                    chartData.weekly_patterns.day_with_least_activities,
                    "📉",
                    colorPalette.secondary,
                    3
                  )}
                </View>
              </View>
              
              <Animated.View style={[styles.chartSectionContainer, {
                opacity: chartAnimations[0],
                transform: [
                  {
                    translateY: chartAnimations[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }]}>
                <Surface style={[styles.chartSectionSurface, {
                  backgroundColor: colorPalette.surface,
                  borderColor: colorPalette.border,
                  borderWidth: 1,
                  shadowColor: colorPalette.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
                }]}>
                  <View style={styles.chartSectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>Weekly Overview</Text>
                  </View>
                  <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
                  <View style={styles.chartContent}>
                    {renderWeekVisualizer()}
                  </View>
                </Surface>
              </Animated.View>
              
              <Animated.View style={[styles.chartSectionContainer, {
                opacity: chartAnimations[1],
                transform: [
                  {
                    translateY: chartAnimations[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }]}>
                <Surface style={[styles.chartSectionSurface, {
                  backgroundColor: colorPalette.surface,
                  borderColor: colorPalette.border,
                  borderWidth: 1,
                  shadowColor: colorPalette.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
                }]}>
                  <View style={styles.chartSectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>Weekly Calendar</Text>
                  </View>
                  <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
                  <View style={styles.chartContent}>
                    {renderWeeklyCalendar()}
                  </View>
                </Surface>
              </Animated.View>
              
              <Animated.View style={[styles.chartSectionContainer, {
                opacity: chartAnimations[2],
                transform: [
                  {
                    translateY: chartAnimations[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }]}>
                <Surface style={[styles.chartSectionSurface, {
                  backgroundColor: colorPalette.surface,
                  borderColor: colorPalette.border,
                  borderWidth: 1,
                  shadowColor: colorPalette.shadow,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
                }]}>
                  <View style={styles.chartSectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>Day Ranking</Text>
                  </View>
                  <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
                  <View style={styles.chartContent}>
                    {renderDayRanking()}
                  </View>
                </Surface>
              </Animated.View>
            </>
          )}
          
          {!loading && !error && chartData && activeTab === "charts" && (
            <>
              {renderChartSection("Time Spent by Day", renderTimeByDayChart(), 0)}
              {renderChartSection("Activities by Day", renderActivitiesByDayChart(), 1)}
              {renderChartSection("Consistency by Day", renderConsistencyByDayChart(), 2)}
            </>
          )}
          
          {!loading && !error && !analyticsData && (
            <View style={styles.centered}>
              <Text style={[styles.noDataText, { color: colorPalette.text }]}>
                No analytics data available.
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

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
  tabSelectorContainer: {
    marginBottom: 24,
  },
  tabSelectorContent: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeTabButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  patternCardsContainer: {
    marginBottom: 24,
  },
  patternCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  patternCardContainer: {
    width: '48%',
  },
  patternCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  patternCardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  patternCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  patternCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  patternCardIconText: {
    fontSize: 18,
  },
  patternCardTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  patternCardValue: {
    fontSize: 22,
    fontWeight: '700',
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
  lineChartContainer: {
    width: '100%',
    alignItems: 'center',
    paddingLeft: 10,
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
  dayRankingContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  dayRankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  dayRankingPosition: {
    width: 30,
    fontSize: 14,
    fontWeight: '700',
  },
  dayRankingDay: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  dayRankingValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  weeklyCalendarContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  calendarDay: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  calendarDayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  calendarDayStatus: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  calendarDayStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekVisualizerContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
});

export default WeeklyPatternsScreen;