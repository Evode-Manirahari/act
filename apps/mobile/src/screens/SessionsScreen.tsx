import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useActoberStore } from '../store/actober';
import { Colors } from '../theme/colors';
import { Session } from '@actober/shared-types';

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Sessions'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

const TRADE_ICONS: Record<string, string> = {
  ELECTRICAL: '⚡',
  HVAC: '❄️',
  PLUMBING: '🔧',
  WELDING: '🔥',
};

function groupByDate(sessions: Session[]): { title: string; data: Session[] }[] {
  const groups: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    const date = new Date(s.startedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(s);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionsScreen({ navigation }: Props) {
  const { sessions } = useActoberStore();
  const groups = groupByDate(sessions);

  if (sessions.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>SESSIONS</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptySubtext}>Start a field session to see your history here.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>SESSIONS</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => (
          <View>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.data.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.card}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              >
                <Text style={styles.tradeIcon}>{TRADE_ICONS[session.trade] ?? '🔨'}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTrade}>{session.trade}</Text>
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {session.jobAddress || 'No address'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {(session.messages?.length ?? 0)} messages · {timeAgo(session.startedAt)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: 'Courier New',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 3,
  },
  list: { padding: 16, gap: 4 },
  groupTitle: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  tradeIcon: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTrade: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardAddress: { fontSize: 14, color: Colors.text, marginBottom: 2 },
  cardMeta: { fontSize: 11, color: Colors.textMuted },
  chevron: { fontSize: 20, color: Colors.textMuted },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyText: {
    fontFamily: 'Courier New',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
