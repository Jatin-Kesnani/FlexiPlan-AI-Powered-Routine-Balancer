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
  ProgressChart,
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

const TimeBalanceScreen = () => {
  const { dark, colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("balance");
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
  
  const balanceScoreAnim = useRef(new Animated.Value(0)).current;
  const ratioAnim = useRef(new Animated.Value(0)).current;
  const chartAnimations = useRef(Array(4).fill(0).map(() => new Animated.Value(0))).current;

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
    primary: dark ? '#F59E0B' : '#F59E0B', // Amber
    secondary: dark ? '#10B981' : '#059669', // Green
    tertiary: dark ? '#6366F1' : '#4F46E5', // Indigo
    quaternary: dark ? '#EC4899' : '#DB2777', // Pink
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
        
        if (data && data.time_balance) {
          Animated.timing(balanceScoreAnim, {
            toValue: data.time_balance.work_life_balance_score / 100,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
          
          Animated.timing(ratioAnim, {
            toValue: data.time_balance.task_vs_hobby_ratio.ratio,
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

    // Time by type data
    const timeByTypeData = [
      {
        name: "Tasks",
        hours: time_analytics.time_by_type.task,
        color: colorPalette.primary,
        legendFontColor: colorPalette.textSecondary,
        legendFontSize: 12,
      },
      {
        name: "Hobbies",
        hours: time_analytics.time_by_type.hobby,
        color: colorPalette.secondary,
        legendFontColor: colorPalette.textSecondary,
        legendFontSize: 12,
      },
    ];

    // Work-life balance data
    const workLifeBalanceData = {
      labels: ["Balance"],
      data: [time_balance.work_life_balance_score / 100],
    };

    // Daily time distribution
    const sortedTimeByDay = sortDays(time_analytics.time_by_day);
    const dailyTimeData = {
      labels: sortedTimeByDay.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedTimeByDay.map(([, hours]) => hours),
          color: (opacity = 1) => colorPalette.tertiary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 3,
        },
      ],
    };

    // Task vs Hobby by day
    const tasksByDay: Record<string, number> = {};
    const hobbiesByDay: Record<string, number> = {};
    
    Object.entries(activity_frequency.activities_by_day).forEach(([day, activities]) => {
      tasksByDay[day] = activities
        .filter(a => a.type === 'task')
        .reduce((sum, a) => sum + a.duration, 0);
      
      hobbiesByDay[day] = activities
        .filter(a => a.type === 'hobby')
        .reduce((sum, a) => sum + a.duration, 0);
    });
    
    const sortedTasksByDay = sortDays(tasksByDay);
    const sortedHobbiesByDay = sortDays(hobbiesByDay);
    
    const taskVsHobbyByDayData = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
            const taskEntry = sortedTasksByDay.find(([d]) => d === day);
            return taskEntry ? taskEntry[1] : 0;
          }),
          color: (opacity = 1) => colorPalette.primary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 2,
        },
        {
          data: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
            const hobbyEntry = sortedHobbiesByDay.find(([d]) => d === day);
            return hobbyEntry ? hobbyEntry[1] : 0;
          }),
          color: (opacity = 1) => colorPalette.secondary + (opacity < 1 ? Math.floor(opacity * 255).toString(16).padStart(2, '0') : ''),
          strokeWidth: 2,
        },
      ],
      legendLabels: ["Tasks", "Hobbies"],
    };

    return {
      timeByTypeData,
      workLifeBalanceData,
      dailyTimeData,
      taskVsHobbyByDayData,
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
            <Text style={styles.headerTitle}>Time Balance</Text>
            <Text style={styles.headerSubtitle}>Analyze your work-life balance</Text>
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
              activeTab === "balance" && [styles.activeTabButton, { backgroundColor: 'rgba(197, 110, 50, 1)' }]
            ]}
            onPress={() => setActiveTab("balance")}
          >
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === "balance" ? '#FFFFFF' : colorPalette.textSecondary }
              ]}
            >
              Balance
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
        </View>
      </View>
    );
  };

  const renderBalanceScore = () => {
    if (!chartData) return null;
    
    const balanceScore = chartData.time_balance.work_life_balance_score;
    const scoreColor = balanceScore >= 70 ? colorPalette.secondary : 
                       balanceScore >= 40 ? colorPalette.primary : 
                       colorPalette.quaternary;
    
    const scoreText = balanceScore >= 70 ? 'Excellent' : 
                      balanceScore >= 40 ? 'Good' : 
                      'Needs Improvement';
    
    return (
      <Animated.View style={[styles.balanceScoreContainer, {
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
        <Surface style={[styles.balanceScoreSurface, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.balanceScoreHeader}>
            <Text style={[styles.balanceScoreTitle, { color: colorPalette.text }]}>Work-Life Balance Score</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.balanceScoreContent}>
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
                  strokeDashoffset={balanceScoreAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [251.2, 251.2 - (251.2 * balanceScore / 100)],
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
                  {balanceScoreAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", `${Math.round(balanceScore)}%`],
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
            <View style={styles.balanceScoreTips}>
              <Text style={[styles.balanceScoreTipTitle, { color: colorPalette.text }]}>
                {balanceScore >= 70 ? 'Great job!' : 
                 balanceScore >= 40 ? 'Good balance' : 
                 'Room for improvement'}
              </Text>
              <Text style={[styles.balanceScoreTipText, { color: colorPalette.textSecondary }]}>
                {balanceScore >= 70 ? 'You have an excellent work-life balance. Keep it up!' : 
                 balanceScore >= 40 ? 'Your work-life balance is good, but there\'s room for improvement.' : 
                 'Try to balance your tasks and hobbies better for improved well-being.'}
              </Text>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderTaskHobbyRatio = () => {
    if (!chartData) return null;
    
    const { task, hobby, ratio } = chartData.time_balance.task_vs_hobby_ratio;
    const totalHours = task + hobby;
    const taskPercentage = (task / totalHours) * 100;
    const hobbyPercentage = (hobby / totalHours) * 100;
    
    return (
      <Animated.View style={[styles.ratioContainer, {
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
        <Surface style={[styles.ratioSurface, {
          backgroundColor: colorPalette.surface,
          borderColor: colorPalette.border,
          borderWidth: 1,
          shadowColor: colorPalette.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }]}>
          <View style={styles.ratioHeader}>
            <Text style={[styles.ratioTitle, { color: colorPalette.text }]}>Task vs Hobby Ratio</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.ratioContent}>
            <View style={styles.ratioVisual}>
              <View style={styles.ratioBar}>
                <View 
                  style={[
                    styles.ratioBarTask, 
                    { 
                      backgroundColor: colorPalette.primary,
                      width: `${taskPercentage}%` 
                    }
                  ]} 
                />
                <View 
                  style={[
                    styles.ratioBarHobby, 
                    { 
                      backgroundColor: colorPalette.secondary,
                      width: `${hobbyPercentage}%` 
                    }
                  ]} 
                />
              </View>
              <View style={styles.ratioLabels}>
                <View style={styles.ratioLabel}>
                  <View style={[styles.ratioLabelColor, { backgroundColor: colorPalette.primary }]} />
                  <Text style={[styles.ratioLabelText, { color: colorPalette.textSecondary }]}>Tasks</Text>
                </View>
                <View style={styles.ratioLabel}>
                  <View style={[styles.ratioLabelColor, { backgroundColor: colorPalette.secondary }]} />
                  <Text style={[styles.ratioLabelText, { color: colorPalette.textSecondary }]}>Hobbies</Text>
                </View>
              </View>
            </View>
            <View style={styles.ratioDetails}>
              <View style={styles.ratioDetailItem}>
                <Text style={[styles.ratioDetailLabel, { color: colorPalette.textSecondary }]}>Tasks</Text>
                <Text style={[styles.ratioDetailValue, { color: colorPalette.primary }]}>{task.toFixed(1)}h</Text>
              </View>
              <View style={styles.ratioDetailItem}>
                <Text style={[styles.ratioDetailLabel, { color: colorPalette.textSecondary }]}>Hobbies</Text>
                <Text style={[styles.ratioDetailValue, { color: colorPalette.secondary }]}>{hobby.toFixed(1)}h</Text>
              </View>
              <View style={styles.ratioDetailItem}>
                <Text style={[styles.ratioDetailLabel, { color: colorPalette.textSecondary }]}>Ratio</Text>
                <Animated.Text style={[styles.ratioDetailValue, { color: colorPalette.text }]}>
                  {ratioAnim.interpolate({
                    inputRange: [0, ratio],
                    outputRange: ["0:1", `${ratio.toFixed(1)}:1`],
                  })}
                </Animated.Text>
              </View>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderPieChart = () => {
    if (!chartData) return null;
    
    return (
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
            <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>Time Distribution</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.chartContent}>
            <View style={styles.customPieChartContainer}>
              <View style={styles.pieChartWrapper}>
                <PieChart
                  data={chartData.timeByTypeData}
                  width={screenWidth}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="hours"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute={false}
                  hasLegend={false}
                  center={[(screenWidth - 64) * 0.3, 0]}
                  avoidFalseZero
                />
              </View>
              <View style={styles.pieChartLegend}>
                {chartData.timeByTypeData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendItemDot, { backgroundColor: item.color }]} />
                    <View style={styles.legendItemTextContainer}>
                      <Text style={[styles.legendItemName, { color: colorPalette.text }]}>{item.name}</Text>
                      <Text style={[styles.legendItemValue, { color: colorPalette.textSecondary }]}>
                        {item.hours.toFixed(1)}h
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderLineChart = () => {
    if (!chartData) return null;
    
    return (
      <Animated.View style={[styles.chartSectionContainer, {
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
            <Text style={[styles.sectionTitle, { color: colorPalette.text }]}>Daily Task vs Hobby</Text>
          </View>
          <Divider style={{ backgroundColor: colorPalette.border, marginHorizontal: 16 }} />
          <View style={styles.chartContent}>
            <View style={styles.lineChartContainer}>
              <LineChart
                data={{
                  labels: chartData.taskVsHobbyByDayData.labels,
                  datasets: chartData.taskVsHobbyByDayData.datasets,
                }}
                width={screenWidth - 64}
                height={220}
                yAxisLabel=""
                yAxisSuffix="h"
                chartConfig={{
                  ...chartConfig,
                  formatYLabel: (value) => `${value}h`,
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
                <View style={[styles.legendItem, {marginRight:10}]}>
                  <View style={[styles.legendColor, { backgroundColor: colorPalette.primary }]} />
                  <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Tasks</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: colorPalette.secondary }]} />
                  <Text style={[styles.legendText, { color: colorPalette.textSecondary }]}>Hobbies</Text>
                </View>
              </View>
            </View>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderBalanceInsights = () => {
    if (!chartData) return null;
    
    const { work_life_balance_score, task_vs_hobby_ratio } = chartData.time_balance;
    
    let insights = [];
    
    if (work_life_balance_score >= 70) {
      insights.push("You have an excellent work-life balance!");
      insights.push("Your time allocation between tasks and hobbies is well-balanced.");
    } else if (work_life_balance_score >= 40) {
      insights.push("Your work-life balance is good, but could be improved.");
      
      if (task_vs_hobby_ratio.ratio > 3) {
        insights.push("Consider allocating more time to hobbies for better balance.");
      } else if (task_vs_hobby_ratio.ratio < 0.5) {
        insights.push("Consider dedicating more time to important tasks.");
      }
    } else {
      insights.push("Your work-life balance needs improvement.");
      
      if (task_vs_hobby_ratio.ratio > 3) {
        insights.push("You're spending too much time on tasks compared to hobbies.");
        insights.push("Try to make more time for activities you enjoy.");
      } else if (task_vs_hobby_ratio.ratio < 0.5) {
        insights.push("You're spending significantly more time on hobbies than tasks.");
        insights.push("Consider balancing with more productive activities.");
      } else {
        insights.push("Your time distribution is uneven throughout the week.");
      }
    }
    
    return (
      <Animated.View style={[styles.insightsContainer, {
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
            <Text style={[styles.insightsTitle, { color: colorPalette.text }]}>Balance Insights</Text>
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
          
          {!loading && !error && chartData && activeTab === "balance" && (
            <>
              {renderBalanceScore()}
              {renderTaskHobbyRatio()}
              {renderBalanceInsights()}
            </>
          )}
          
          {!loading && !error && chartData && activeTab === "details" && (
            <>
              {renderPieChart()}
              {renderLineChart()}
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
  balanceScoreContainer: {
    marginBottom: 24,
  },
  balanceScoreSurface: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  balanceScoreHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  balanceScoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  balanceScoreContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  balanceScoreTips: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  balanceScoreTipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceScoreTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ratioContainer: {
    marginBottom: 24,
  },
  ratioSurface: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  ratioHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  ratioTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ratioContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  ratioVisual: {
    marginBottom: 24,
  },
  ratioBar: {
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  ratioBarTask: {
    height: '100%',
  },
  ratioBarHobby: {
    height: '100%',
  },
  ratioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratioLabelColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  ratioLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratioDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 16,
  },
  ratioDetailItem: {
    alignItems: 'center',
  },
  ratioDetailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  ratioDetailValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartSectionContainer: {
    marginBottom: 24,
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
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  customPieChartContainer: {
    // flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    width: '100%',
  },
  pieChartWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  pieChartLegend: {
    flexDirection: 'row',
    alignItems:'center',
    // justifyContent:'space-evenly',
    width: '25%',
    // borderWidth:1
    marginLeft:-80
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  legendItemDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendItemTextContainer: {
    flex: 1,
  },
  legendItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  legendItemValue: {
    fontSize: 14,
  },
  lineChartContainer: {
    width: '100%',
    alignItems: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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

export default TimeBalanceScreen;