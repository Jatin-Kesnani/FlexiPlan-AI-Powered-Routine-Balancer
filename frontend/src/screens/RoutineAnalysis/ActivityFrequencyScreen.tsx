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
  PieChart,
  LineChart,
  ContributionGraph,
} from "react-native-chart-kit";
import { Card, Surface, Divider } from "react-native-paper";
import { fetchRoutineAnalytics } from "../../utils/api";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

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

const ActivityFrequencyScreen = () => {
  const { dark, colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
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
  
  const chartAnimations = useRef(Array(5).fill(0).map(() => new Animated.Value(0))).current;

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
        
        if (data && data.weekly_patterns && data.weekly_patterns.most_busy_day) {
          setSelectedDay(data.weekly_patterns.most_busy_day);
        } else {
          setSelectedDay("Monday");
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

    // Most frequent activities data with better formatting
    const mostFrequentActivitiesData = {
      labels: activity_frequency.most_frequent_activities
        .slice(0, 6)
        .map((a) => a.activity.length > 10 ? a.activity.substring(0, 8) + "..." : a.activity),
      datasets: [
        {
          data: activity_frequency.most_frequent_activities
            .slice(0, 6)
            .map((a) => a.total_hours),
          colors: activity_frequency.most_frequent_activities
            .slice(0, 6)
            .map((_, i) => () => chartColors[i % chartColors.length]),
        },
      ],
    };

    // Activities by day data
    const activitiesByDay = {};
    Object.entries(activity_frequency.activities_by_day).forEach(([day, activities]) => {
      activitiesByDay[day] = activities.map(activity => ({
        ...activity,
        color: activity.type === 'task' ? colorPalette.primary : colorPalette.secondary
      }));
    });

    // Activity distribution by type
    const activityTypeDistribution = {
      labels: ["Tasks", "Hobbies"],
      datasets: [
        {
          data: [
            activity_frequency.most_frequent_activities.filter(a => 
              analyticsData.completion_analytics.completion_by_activity_type.task.completed > 0
            ).length,
            activity_frequency.most_frequent_activities.filter(a => 
              analyticsData.completion_analytics.completion_by_activity_type.hobby.completed > 0
            ).length,
          ],
          colors: [() => colorPalette.primary, () => colorPalette.secondary],
        },
      ],
    };

    // Activity heatmap data (for contribution graph)
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
      const dayActivities = activity_frequency.activities_by_day[dayName] || [];
      const count = dayActivities.length;
      
      if (count > 0 || Math.random() > 0.7) { // Add some random data for visualization
        heatmapData.push({
          date: date.toISOString().split('T')[0],
          count: count || Math.floor(Math.random() * 5) + 1
        });
      }
    }

    return {
      mostFrequentActivitiesData,
      activitiesByDay,
      activityTypeDistribution,
      heatmapData,
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
            <Text style={styles.headerTitle}>Activity Frequency</Text>
            <Text style={styles.headerSubtitle}>Track your most frequent activities</Text>
          </Animated.View>
        </LinearGradient>
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

  const renderMostFrequentActivitiesChart = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.barChartContainer}>
        <BarChart
          data={chartData.mostFrequentActivitiesData}
          width={screenWidth - 64}
          height={220}
          yAxisLabel=""
          yAxisSuffix="h"
          chartConfig={{
            ...chartConfig,
            formatYLabel: (value) => `${value}h`,
          }}
          style={styles.chartStyle}
          withInnerLines={true}
          showValuesOnTopOfBars={true}
          fromZero
          segments={4}
          withCustomBarColorFromData
          flatColor
        />
      </View>
    );
  };

  const renderActivityTypeDistribution = () => {
    if (!chartData) return null;
    
    return (
      <View style={styles.barChartContainer}>
        <BarChart
          data={chartData.activityTypeDistribution}
          width={screenWidth - 10}
          height={220}
          yAxisLabel=""
          chartConfig={{
            ...chartConfig,
            formatYLabel: (value) => `${value}`,
          }}
          style={styles.chartStyle}
          withInnerLines={true}
          showValuesOnTopOfBars={true}
          fromZero
          segments={4}
          withCustomBarColorFromData
          flatColor
        />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colorPalette.primary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Tasks</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colorPalette.secondary }]} />
            <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Hobbies</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderActivityHeatmap = () => {
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
          Activity frequency over the last 3 months
        </Text>
      </View>
    );
  };

  const renderDaySelector = () => {
    if (!chartData) return null;
    
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    return (
      <View style={styles.daySelectorContainer}>
        <Text style={[styles.daySelectorTitle, { color: colorPalette.text }]}>
          Activities by Day
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
        >
          {days.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDay === day && { 
                  backgroundColor: colorPalette.primary,
                  borderColor: colorPalette.primary,
                }
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  { color: selectedDay === day ? '#FFFFFF' : colorPalette.textSecondary }
                ]}
              >
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDayActivities = () => {
    if (!chartData || !selectedDay) return null;
    
    const activities = chartData.activitiesByDay[selectedDay] || [];
    
    if (activities.length === 0) {
      return (
        <View style={styles.noActivitiesContainer}>
          <Text style={[styles.noActivitiesText, { color: colorPalette.textSecondary }]}>
            No activities recorded for {selectedDay}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.dayActivitiesContainer}>
        {activities.map((activity, index) => (
          <Animated.View 
            key={`${selectedDay}-${activity.activity}-${index}`}
            style={[
              styles.activityCard,
              { 
                backgroundColor: colorPalette.surface,
                borderColor: colorPalette.border,
              },
              {
                opacity: fadeAnim,
                transform: [{ 
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }) 
                }]
              }
            ]}
          >
            <View 
              style={[
                styles.activityTypeIndicator, 
                { backgroundColor: activity.type === 'task' ? colorPalette.primary : colorPalette.secondary }
              ]} 
            />
            <View style={styles.activityContent}>
              <Text style={[styles.activityName, { color: colorPalette.text }]}>
                {activity.activity}
              </Text>
              <View style={styles.activityDetails}>
                <Text style={[styles.activityType, { color: colorPalette.textSecondary }]}>
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </Text>
                <Text style={[styles.activityDuration, { color: colorPalette.text }]}>
                  {activity.duration.toFixed(1)}h
                </Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderActivityInsights = () => {
    if (!chartData) return null;
    
    return (
      <View style={[styles.insightsContainer, {marginTop:20}]}>
        <View style={styles.insightsRow}>
          <InsightCard 
            title="Most Active"
            value={chartData.weekly_patterns.most_busy_day || 'N/A'}
            icon="🔥"
            color={colorPalette.primary}
          />
          <InsightCard 
            title="Least Active"
            value={chartData.weekly_patterns.least_busy_day || 'N/A'}
            icon="🌙"
            color={colorPalette.secondary}
          />
        </View>
        <View style={styles.insightsRow}>
          <InsightCard 
            title="Most Activities"
            value={chartData.weekly_patterns.day_with_most_activities || 'N/A'}
            icon="📊"
            color={colorPalette.tertiary}
          />
          <InsightCard 
            title="Task/Hobby Ratio"
            value={`${chartData.time_balance.task_vs_hobby_ratio.ratio.toFixed(1)}`}
            icon="⚖️"
            color={colorPalette.quaternary}
          />
        </View>
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
          
          {!loading && !error && chartData && (
            <>
              {renderActivityInsights()}
              
              {renderChartSection("Most Frequent Activities", renderMostFrequentActivitiesChart(), 0)}
              
              {renderChartSection("Activity Type Distribution", renderActivityTypeDistribution(), 1)}
              
              {/* {renderChartSection("Activity Heatmap", renderActivityHeatmap(), 2)} */}
              
              {renderDaySelector()}
              
              {renderDayActivities()}
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

const InsightCard = ({ title, value, icon, color }) => {
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
  
  const colorPalette = {
    surface: dark ? '#2D3748' : '#FFFFFF',
    text: dark ? '#F7FAFC' : '#1A202C',
    textSecondary: dark ? '#A0AEC0' : '#4A5568',
  };
  
  return (
    <Animated.View style={[styles.insightCard, animatedStyle]}>
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        style={styles.insightCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.insightCardContent}>
          <View style={[styles.insightIconContainer, { backgroundColor: `${color}20` }]}>
            <Text style={styles.insightIcon}>{icon}</Text>
          </View>
          <View style={styles.insightTextContainer}>
            <Text style={[styles.insightTitle, { color: colorPalette.textSecondary }]}>{title}</Text>
            <Text style={[styles.insightValue, { color }]}>{value}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
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
  insightsContainer: {
    marginBottom: 24,
  },
  insightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  insightCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  insightCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  daySelectorContainer: {
    marginBottom: 20,
  },
  daySelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  daySelectorContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayActivitiesContainer: {
    marginBottom: 24,
  },
  activityCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityTypeIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityType: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityDuration: {
    fontSize: 14,
    fontWeight: '700',
  },
  noActivitiesContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActivitiesText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ActivityFrequencyScreen;