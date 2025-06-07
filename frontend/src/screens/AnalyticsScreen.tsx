import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import {
  BarChart,
  PieChart,
  LineChart,
  ProgressChart,
  ContributionGraph,
  StackedBarChart,
} from "react-native-chart-kit";
import { Card } from "react-native-paper";
import { fetchRoutineAnalytics } from "../utils/api";
import { useTheme } from "@react-navigation/native";

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

const AnalyticsScreen = () => {
  const { colors } = useTheme();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const screenWidth = Dimensions.get("window").width;

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726",
    },
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
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    // Activity completion rates data
    const activityCompletionData = Object.entries(
      completion_analytics.activity_completion_rates
    ).map(([activity, data]) => ({
      name: activity,
      percentage: data.percentage,
      color: data.percentage > 50 ? "#4CAF50" : "#F44336",
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));

    // Time by day data
    const sortedTimeByDay = sortDays(time_analytics.time_by_day);
    const timeByDayData = {
      labels: sortedTimeByDay.map(([day]) => day.substring(0, 3)),
      datasets: [
        {
          data: sortedTimeByDay.map(([, hours]) => hours),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    // Time by activity data
    const timeByActivityData = Object.entries(time_analytics.time_by_activity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([activity, hours]) => ({
        name: activity,
        hours,
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        legendFontColor: colors.text,
        legendFontSize: 12,
      }));

    // Time by type data
    const timeByTypeData = [
      {
        name: "Tasks",
        hours: time_analytics.time_by_type.task,
        color: "#2196F3",
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
      {
        name: "Hobbies",
        hours: time_analytics.time_by_type.hobby,
        color: "#FF9800",
        legendFontColor: colors.text,
        legendFontSize: 12,
      },
    ];

    // Work-life balance data
    const workLifeBalanceData = {
      labels: ["Balance"],
      data: [time_balance.work_life_balance_score / 100],
    };

    // Most frequent activities data
    const mostFrequentActivitiesData = {
      labels: activity_frequency.most_frequent_activities.map((a) => a.activity),
      datasets: [
        {
          data: activity_frequency.most_frequent_activities.map((a) => a.total_hours),
        },
      ],
    };

    return {
      dailyCompletionData,
      activityCompletionData,
      timeByDayData,
      timeByActivityData,
      timeByTypeData,
      workLifeBalanceData,
      mostFrequentActivitiesData,
      weekly_patterns,
      time_balance,
      consistency_score,
      completion_analytics,
      time_analytics,
    };
  };

  const chartData = prepareChartData();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <Text style={[styles.screenTitle, { color: colors.text }]}>
        Analytics Overview
      </Text>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading Analytics...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: "#e74c3c" }]}>Error: {error}</Text>
        </View>
      )}

      {!loading && !error && chartData && (
        <>
          {/* Completion Analytics Section */}
          <Card style={styles.card}>
            <Card.Title title="Completion Analytics" titleStyle={{ color: colors.text }} />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Daily Completion Rates
              </Text>
              <BarChart
                data={chartData.dailyCompletionData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={chartConfig}
                verticalLabelRotation={30}
                fromZero
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Activity Completion Rates
              </Text>
              <PieChart
                data={chartData.activityCompletionData}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="percentage"
                backgroundColor="transparent"
                paddingLeft="15"
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Overall Completion Rate:{" "}
                {chartData.completion_analytics.overall_completion_rate.percentage}%
              </Text>
              <ProgressChart
                data={[
                  chartData.completion_analytics.overall_completion_rate.percentage / 100,
                ]}
                width={screenWidth - 32}
                height={100}
                chartConfig={chartConfig}
                hideLegend
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Completion by Activity Type
              </Text>
              <PieChart
                data={[
                  {
                    name: "Tasks",
                    percentage:
                      chartData.completion_analytics.completion_by_activity_type.task
                        .percentage,
                    color: "#2196F3",
                    legendFontColor: colors.text,
                    legendFontSize: 12,
                  },
                  {
                    name: "Hobbies",
                    percentage:
                      chartData.completion_analytics.completion_by_activity_type.hobby
                        .percentage,
                    color: "#FF9800",
                    legendFontColor: colors.text,
                    legendFontSize: 12,
                  },
                ]}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="percentage"
                backgroundColor="transparent"
                paddingLeft="15"
              />
            </Card.Content>
          </Card>

          {/* Time Analytics Section */}
          <Card style={styles.card}>
            <Card.Title title="Time Analytics" titleStyle={{ color: colors.text }} />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Time Spent by Day
              </Text>
              <LineChart
                data={chartData.timeByDayData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel="h "
                chartConfig={chartConfig}
                bezier
                fromZero
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Time by Activity (Top 5)
              </Text>
              <PieChart
                data={chartData.timeByActivityData}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="hours"
                backgroundColor="transparent"
                paddingLeft="15"
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Time by Type (Task vs Hobby)
              </Text>
              <PieChart
                data={chartData.timeByTypeData}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="hours"
                backgroundColor="transparent"
                paddingLeft="15"
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Average Daily Time: {chartData.time_analytics.average_daily_time} hours
              </Text>
            </Card.Content>
          </Card>

          {/* Activity Frequency Section */}
          <Card style={styles.card}>
            <Card.Title
              title="Activity Frequency"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Most Frequent Activities
              </Text>
              <BarChart
                data={chartData.mostFrequentActivitiesData}
                width={screenWidth - 32}
                height={220}
                yAxisLabel=""
                yAxisSuffix="h"
                chartConfig={chartConfig}
                verticalLabelRotation={30}
              />
            </Card.Content>
          </Card>

          {/* Weekly Patterns Section */}
          <Card style={styles.card}>
            <Card.Title
              title="Weekly Patterns"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Busiest Day: {chartData.weekly_patterns.most_busy_day}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Least Busy Day: {chartData.weekly_patterns.least_busy_day}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Most Activities: {chartData.weekly_patterns.day_with_most_activities}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Least Activities: {chartData.weekly_patterns.day_with_least_activities}
              </Text>
            </Card.Content>
          </Card>

          {/* Time Balance Section */}
          <Card style={styles.card}>
            <Card.Title title="Time Balance" titleStyle={{ color: colors.text }} />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Task vs Hobby Ratio:{" "}
                {chartData.time_balance.task_vs_hobby_ratio.ratio.toFixed(2)}:1
              </Text>
              <PieChart
                data={[
                  {
                    name: "Tasks",
                    hours: chartData.time_balance.task_vs_hobby_ratio.task,
                    color: "#2196F3",
                    legendFontColor: colors.text,
                    legendFontSize: 12,
                  },
                  {
                    name: "Hobbies",
                    hours: chartData.time_balance.task_vs_hobby_ratio.hobby,
                    color: "#FF9800",
                    legendFontColor: colors.text,
                    legendFontSize: 12,
                  },
                ]}
                width={screenWidth - 32}
                height={200}
                chartConfig={chartConfig}
                accessor="hours"
                backgroundColor="transparent"
                paddingLeft="15"
              />

              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Work-Life Balance Score:{" "}
                {chartData.time_balance.work_life_balance_score}%
              </Text>
              <ProgressChart
                data={[chartData.time_balance.work_life_balance_score / 100]}
                width={screenWidth - 32}
                height={100}
                chartConfig={chartConfig}
                hideLegend
              />
            </Card.Content>
          </Card>

          {/* Consistency Score Section */}
          <Card style={styles.card}>
            <Card.Title
              title="Consistency Score"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Average Daily Completion:{" "}
                {chartData.consistency_score.average_daily_completion}%
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Most Consistent Day: {chartData.consistency_score.most_consistent_day}
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Least Consistent Day: {chartData.consistency_score.least_consistent_day}
              </Text>
            </Card.Content>
          </Card>
        </>
      )}

      {!loading && !error && !analyticsData && (
        <View style={styles.centered}>
          <Text style={[styles.noDataText, { color: colors.text }]}>
            Could not load analytics data.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 8,
  },
  noDataText: {
    textAlign: "center",
    marginVertical: 30,
    fontSize: 15,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default AnalyticsScreen;