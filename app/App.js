import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';

const Stack = createNativeStackNavigator();

// 首页仪表盘
function DashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard');
      setData(response.data);
    } catch (e) {
      console.error('获取数据失败:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (!data) {
    return <View style={styles.container}><Text>加载中...</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 账户概览 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>账户概览</Text>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>总权益</Text>
            <Text style={styles.value}>${data.account.totalEquity.toFixed(2)}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>今日盈亏</Text>
            <Text style={[styles.value, data.account.dailyPnL >= 0 ? styles.positive : styles.negative]}>
              {data.account.dailyPnL >= 0 ? '+' : ''}{data.account.dailyPnL.toFixed(2)}%
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>可用余额</Text>
            <Text style={styles.value}>${data.account.available.toFixed(2)}</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>未实现盈亏</Text>
            <Text style={[styles.value, data.account.unrealizedPnL >= 0 ? styles.positive : styles.negative]}>
              {data.account.unrealizedPnL >= 0 ? '+' : ''}${data.account.unrealizedPnL.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* 当前持仓 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>当前持仓</Text>
        {data.positions.length === 0 ? (
          <Text style={styles.emptyText}>无持仓</Text>
        ) : (
          data.positions.map((pos, index) => (
            <View key={index} style={styles.positionItem}>
              <View style={styles.positionHeader}>
                <Text style={styles.positionSymbol}>{pos.symbol}</Text>
                <Text style={[styles.positionSide, pos.side === 'long' ? styles.long : styles.short]}>
                  {pos.side === 'long' ? '多' : '空'}
                </Text>
              </View>
              <View style={styles.row}>
                <View style={styles.item}>
                  <Text style={styles.label}>数量</Text>
                  <Text style={styles.value}>{pos.size}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.label}>均价</Text>
                  <Text style={styles.value}>${pos.avgPx.toFixed(2)}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.label}>盈亏</Text>
                  <Text style={[styles.value, pos.pnl >= 0 ? styles.positive : styles.negative]}>
                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 市场行情 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>市场行情</Text>
        {data.market.map((item, index) => (
          <View key={index} style={styles.marketItem}>
            <Text style={styles.marketSymbol}>{item.symbol}</Text>
            <Text style={styles.marketPrice}>${item.price}</Text>
            <Text style={[styles.marketChange, item.change24h >= 0 ? styles.positive : styles.negative]}>
              {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>

      {/* 系统状态 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>系统状态</Text>
        <View style={styles.row}>
          <View style={styles.statusItem}>
            <Text style={styles.label}>行情监控</Text>
            <Text style={[styles.statusValue, data.system.marketMonitor ? styles.online : styles.offline]}>
              {data.system.marketMonitor ? '✅ 运行中' : '❌ 未运行'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.label}>风控系统</Text>
            <Text style={[styles.statusValue, data.system.riskMonitor ? styles.online : styles.offline]}>
              {data.system.riskMonitor ? '✅ 运行中' : '❌ 未运行'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.statusItem}>
            <Text style={styles.label}>交易策略</Text>
            <Text style={[styles.statusValue, data.system.tradingStrategy ? styles.online : styles.offline]}>
              {data.system.tradingStrategy ? '✅ 运行中' : '❌ 未运行'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.label}>网络延迟</Text>
            <Text style={styles.value}>{data.network.latency}ms</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" options={{ title: 'Coosin 量化交易系统' }} component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  positive: {
    color: '#00b894',
  },
  negative: {
    color: '#d63031',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  positionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginBottom: 10,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  positionSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  positionSide: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  long: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  short: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  marketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  marketSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  marketPrice: {
    fontSize: 16,
    color: '#333',
  },
  marketChange: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  online: {
    color: '#00b894',
  },
  offline: {
    color: '#d63031',
  },
});
