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
import { Svg, Circle, Path, G, Text as SvgText, Rect } from "react-native-svg";

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

const ConsistencyScoreScreen = () => {
  const { dark, colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
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
  
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const chartAnimations = useRef(Array(4).fill(0).map(() => new Animated.Value(0))).current;
  const cardAnimations = useRef(Array(3).fill(0).map(() => new Animated.Value(0))).current;

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
      ...chartAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 400 + (index * 200),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ),
      ...cardAnimations.map((anim, index) => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          delay: 300 + (index * 150),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ]).start();
  }, [loading]);

  const colorPalette = {
    primary: dark ? '#8B5CF6' : '#7C3AED', // Purple
    secondary: dark ? '#EC4899' : '#DB2777', // Pink
    tertiary: dark ? '#10B981' : '#059669', // Green
    quaternary: dark ? '#F59E0B' : '#F59E0B', // Amber
    quinary: dark ? '#6366F1' : '#4F46E5', // Indigo
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
        
        if (data && data.consistency_score) {
          Animated.timing(scoreAnim, {
            toValue: data.consistency_score.average_daily_completion / 100,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
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

    // Consistency by day data
    const consistencyByDayData = {
      labels: sortedDailyCompletion.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedDailyCompletion.map(([, data]) => data.completed / (data.total || 1) * 100),
          color: (opacity = 1) => colorPalette.tertiary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Activity completion rates data
    const activityCompletionRates = Object.entries(completion_analytics.activity_completion_rates)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .slice(0, 5);
    
    const activityCompletionData = {
      labels: activityCompletionRates.map(([activity]) => 
        activity.length > 10 ? activity.substring(0, 8) + "..." : activity
      ),
      datasets: [
        {
          data: activityCompletionRates.map(([, data]) => data.percentage),
          color: (opacity = 1) => colorPalette.secondary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 2,
        },
      ],
    };

    // Consistency heatmap data (for contribution graph)
    const today = new Date();
    const heatmapData = [];
    
    // Generate some sample data for the last 3 months
    for (let i = 90; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Get day of week
      const dayOfWeek = date.getDay();
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];
      
      // Check if we have data for this day
      const dayData = completion_analytics.daily_completion_rates[dayName];
      const count = dayData ? Math.round(dayData.percentage / 20) : 0; // Scale to 0-5
      
      if (count > 0 || Math.random() > 0.7) { // Add some random data for visualization
        heatmapData.push({
          date: date.toISOString().split('T')[0],
          count: count || Math.floor(Math.random() * 5) + 1
        });
      }
    }

    // Consistency progress data
    const consistencyProgressData = {
      labels: ["Consistency"],
      data: [consistency_score.average_daily_completion / 100],
    };

    // Day ranking by consistency
    const dayRankingData = sortedDailyCompletion
      .map(([day, data]) => ({
        day,
        percentage: data.percentage
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      dailyCompletionData,
      consistencyByDayData,
      activityCompletionData,
      heatmapData,
      consistencyProgressData,
      dayRankingData,
      weekly_patterns,
      time_balance,
      consistency_score,
      completion_analytics,
      time_analytics,
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
            <Text style={styles.headerTitle}>Consistency Score</Text>
            <Text style={styles.headerSubtitle}>Track your routine consistency</Text>
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
              activeTab === "overview" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "overview" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "details" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("details")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "details" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "trends" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("trends")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "trends" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Trends
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConsistencyScore = () => {
    if (!chartData) return null;
    
    const score = chartData.consistency_score.average_daily_completion;
    const scoreColor = score >= 75 ? colorPalette.tertiary : 
                       score >= 50 ? colorPalette.quaternary : 
                       colorPalette.secondary;
    
    const scoreText = score >= 75 ? 'Excellent' : 
                      score >= 50 ? 'Good' : 
                      'Needs Improvement';
    
    return (
      <Animated.View style={[styles.scoreContainer, {
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
        <Surface style={[styles.scoreSurface, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreTitle, { color: colorPalette.text }]}>Consistency Score</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.scoreContent}>
            <View style={styles.gaugeContainer}>
              <Svg width={200} height={120}>
                <Path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  stroke={`${scoreColor}30`}
                  strokeWidth="12"
                  fill="none"
                />
                <AnimatedPath
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  stroke={scoreColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="251.2"
                  strokeDashoffset={scoreAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [251.2, 251.2 - (251.2 * score / 100)],
                  })}
                />
                <Circle cx="100" cy="100" r="60" fill={colorPalette.surface} />
                <AnimatedSvgText
                  x="100"
                  y="95"
                  fontSize="32"
                  fontWeight="bold"
                  fill={scoreColor}
                  textAnchor="middle"
                >
                  {scoreAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", `${Math.round(score)}%`],
                  })}
                </AnimatedSvgText>
                <SvgText
                  x="100"
                  y="120"
                  fontSize="14"
                  fill={colorPalette.textSecondary}
                  textAnchor="middle"
                >
                  {scoreText}
                </SvgText>
              </Svg>
            </View>
            <View style={styles.scoreTips}>
              <Text style={[styles.scoreTipTitle, { color: colorPalette.text }]}>
                {score >= 75 ? 'Great job!' : 
                 score >= 50 ? 'Good consistency' : 
                 'Room for improvement'}
              </Text>
              <Text style={[styles.scoreTipText, { color: colorPalette.textSecondary }]}>
                {score >= 75 ? 'You have excellent routine consistency. Keep it up!' : 
                 score >= 50 ? 'Your consistency is good, but there\'s room for improvement.' : 
                 'Try to be more consistent with your routines for better results.'}
              </Text>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderConsistencyCards = () => {
    if (!chartData) return null;
    
    const { most_consistent_day, least_consistent_day } = chartData.consistency_score;
    
    return (
      <View style={styles.consistencyCardsContainer}>
        <Animated.View style={[styles.consistencyCardContainer, {
          opacity: cardAnimations[0],
          transform: [
            {
              translateY: cardAnimations[0].interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }]}>
          <Surface style={[styles.consistencyCard, {
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
              colors={[`${colorPalette.tertiary}15`, `${colorPalette.tertiary}05`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.consistencyCardGradient}
            >
              <View style={styles.consistencyCardHeader}>
                <View style={[styles.consistencyCardIcon, { backgroundColor: `${colorPalette.tertiary}20` }]}>
                  <Text style={styles.consistencyCardIconText}>🏆</Text>
                </View>
                <View style={{flexDirection:'column'}}>
                  <Text style={[styles.consistencyCardTitle, { color: colorPalette.textSecondary }]}>Most</Text>
                  <Text style={[styles.consistencyCardTitle, { color: colorPalette.textSecondary }]}>Consistent Day</Text>
                </View>
              </View>
              <Text style={[styles.consistencyCardValue, { color: colorPalette.tertiary }]}>{most_consistent_day || 'N/A'}</Text>
            </LinearGradient>
          </Surface>
        </Animated.View>
        
        <Animated.View style={[styles.consistencyCardContainer, {
          opacity: cardAnimations[1],
          transform: [
            {
              translateY: cardAnimations[1].interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }]}>
          <Surface style={[styles.consistencyCard, {
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
              colors={[`${colorPalette.secondary}15`, `${colorPalette.secondary}05`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.consistencyCardGradient}
            >
              <View style={styles.consistencyCardHeader}>
                <View style={[styles.consistencyCardIcon, { backgroundColor: `${colorPalette.secondary}20` }]}>
                  <Text style={styles.consistencyCardIconText}>📉</Text>
                </View>
                <View style={{flexDirection:'column'}}>
                  <Text style={[styles.consistencyCardTitle, { color: colorPalette.textSecondary }]}>Least</Text>
                  <Text style={[styles.consistencyCardTitle, { color: colorPalette.textSecondary }]}>Consistent Day</Text>
                </View>
              </View>
              <Text style={[styles.consistencyCardValue, { color: colorPalette.secondary }]}>{least_consistent_day || 'N/A'}</Text>
            </LinearGradient>
          </Surface>
        </Animated.View>
      </View>
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

  const renderDailyConsistencyChart = () => {
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
            formatYLabel: (value) => `${value}%`,
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
            <View style={[styles.legendColor, { backgroundColor: colorPalette.tertiary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Consistency Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActivityCompletionChart = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.barChartContainer}>
        <BarChart
          data={chartData.activityCompletionData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel=""
          yAxisSuffix="%"
          chartConfig={{
            ...chartConfig,
            formatYLabel: (value) => `${value}%`,
            color: (opacity = 1) => colorPalette.secondary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          }}
          style={styles.chartStyle}
          withInnerLines={true}
          showValuesOnTopOfBars={true}
          fromZero
          segments={4}
        />
      </View>
    );
  };

  const renderConsistencyHeatmap = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.heatmapContainer}>
        <ContributionGraph
          values={chartData.heatmapData}
          endDate={new Date()}
          numDays={90}
          width={screenWidth - 64}
          height={220}
          chartConfig={{
            ...chartConfig,
            backgroundGradientFrom: colorPalette.surface,
            backgroundGradientTo: colorPalette.surface,
            color: (opacity = 1) => colorPalette.primary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          }}
          style={styles.chartStyle}
        />
        <Text style={[styles.heatmapCaption, { color: colorPalette.textSecondary }]}>
          Consistency over the last 3 months
        </Text>
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
              {day.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderConsistencyInsights = () => {
    if (!chartData) return null;
    
    const { average_daily_completion, most_consistent_day, least_consistent_day } = chartData.consistency_score;
    
    let insights = [];
    
    if (average_daily_completion >= 75) {
      insights.push("You have excellent routine consistency!");
      insights.push(`${most_consistent_day} is your most consistent day.`);
      insights.push("Maintaining this level of consistency will lead to great results.");
    } else if (average_daily_completion >= 50) {
      insights.push("Your consistency is good, but there's room for improvement.");
      
      if (most_consistent_day && least_consistent_day) {
        insights.push(`Try to bring your ${least_consistent_day} consistency up to match your ${most_consistent_day} performance.`);
      }
      
      insights.push("Aim for at least 75% consistency for optimal results.");
    } else {
      insights.push("Your consistency needs improvement.");
      
      if (most_consistent_day) {
        insights.push(`${most_consistent_day} is your best day - try to replicate what works on this day.`);
      }
      
      if (least_consistent_day) {
        insights.push(`${least_consistent_day} is your least consistent day - consider adjusting your routine on this day.`);
      }
      
      insights.push("Setting reminders and creating a structured routine can help improve consistency.");
    }
    
    return (
      <Animated.View style={[styles.insightsContainer, {
        opacity: chartAnimations[3],
        transform: [
          {
            translateY: chartAnimations[3].interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
      }]}>
        <Surface style={[styles.insightsSurface, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.insightsHeader}>
            <Text style={[styles.insightsTitle, { color: colorPalette.text }]}>Consistency Insights</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.insightsContent}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <View style={[styles.insightBullet, { backgroundColor: colorPalette.primary }]} />
                <Text style={[styles.insightText, { color: colorPalette.text }]}>{insight}</Text>
              </View>
            ))}
          </View>
        </Surface>
      </Animated.View>
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
          
          {!loading && !error && chartData && activeTab === "overview" && (
            <>
              {renderConsistencyScore()}
              {renderConsistencyCards()}
              {renderConsistencyInsights()}
            </>
          )}
          
          {!loading && !error && chartData && activeTab === "details" && (
            <>
              {renderChartSection("Daily Consistency", renderDailyConsistencyChart(), 0)}
              {renderChartSection("Activity Completion", renderActivityCompletionChart(), 1)}
              {renderChartSection("Day Ranking", renderDayRanking(), 2)}
            </>
          )}
          
          {!loading && !error && chartData && activeTab === "trends" && (
            <>
              {renderChartSection("Consistency Heatmap", renderConsistencyHeatmap(), 0)}
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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

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
  scoreContainer: {
    marginBottom: 24,
  },
  scoreSurface: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  scoreHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scoreContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scoreTips: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  scoreTipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  consistencyCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  consistencyCardContainer: {
    width: '48%',
  },
  consistencyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  consistencyCardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  consistencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consistencyCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  consistencyCardIconText: {
    fontSize: 18,
  },
  consistencyCardTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  consistencyCardValue: {
    fontSize: 20,
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
  barChartContainer: {
    width: '100%',
    alignItems: 'center',
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
  heatmapContainer: {
    width: '100%',
    alignItems: 'center',
  },
  heatmapCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
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
  insightsContainer: {
    marginBottom: 24,
  },
  insightsSurface: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  insightsHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  insightsContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  insightBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ConsistencyScoreScreen;