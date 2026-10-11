import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParentStackParamList, NotificationLog } from '../../types';
import { supabase } from '../../config/supabase';
import { formatRelativeTime } from '../../utils/formatTime';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'NotificationHistory'>;
  route: RouteProp<ParentStackParamList, 'NotificationHistory'>;
};

const PAGE_SIZE = 20;

type FilterType = 'TODAS' | 'WHATSAPP' | 'TIKTOK' | 'RIESGO';

// Fallback sample data if Supabase table is empty initially
const MOCK_NOTIFICATIONS: NotificationLog[] = [
  {
    id: 'mock_1',
    childId: 'child_mateo_01',
    appName: 'WhatsApp',
    title: 'Mamá',
    message: 'Hijo, recuerda llevar tu chaqueta que va a llover.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: 'mock_2',
    childId: 'child_mateo_01',
    appName: 'TikTok',
    title: 'TikTok',
    message: 'A @carlos_23 le gustó tu video compartido.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'mock_3',
    childId: 'child_mateo_01',
    appName: 'WhatsApp',
    title: 'Grupo Ciencias 6B',
    message: 'Mañana tenemos entrega del experimento a primera hora.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'mock_4',
    childId: 'child_mateo_01',
    appName: 'Instagram',
    title: 'Mensaje directo',
    message: 'Oye pásame la foto que tomaste en el recreo',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'mock_5',
    childId: 'child_mateo_01',
    appName: 'YouTube',
    title: 'Canal Suscrito',
    message: 'Nuevo video: ¿Cómo funciona la inteligencia artificial?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'mock_6',
    childId: 'child_mateo_01',
    appName: 'WhatsApp',
    title: 'Lucas',
    message: '¿Vamos a jugar fútbol saliendo de clase?',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: 'mock_7',
    childId: 'child_mateo_01',
    appName: 'TikTok',
    title: 'Tendencias',
    message: 'Mira los videos más populares de hoy en tu zona.',
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

export const NotificationHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const childId = route.params?.childId || 'child_mateo_01';

  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('TODAS');

  // Fetch notifications with pagination from Supabase
  const fetchNotifications = useCallback(
    async (pageIndex = 0, isRefresh = false) => {
      try {
        if (pageIndex === 0 && !isRefresh) setLoading(true);
        if (pageIndex > 0) setLoadingMore(true);

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from('notifications_log')
          .select('*')
          .order('received_at', { ascending: false })
          .range(from, to);

        if (childId) {
          query = query.eq('child_id', childId);
        }

        const { data, error } = await query;

        if (error) {
          console.warn('Supabase notifications_log query note:', error.message);
        }

        const fetchedItems: NotificationLog[] =
          data && data.length > 0
            ? data.map((d: any) => ({
                id: d.id,
                childId: d.child_id,
                appName: d.app_name || 'App',
                title: d.title || 'Notificación',
                message: d.message || '',
                receivedAt: d.received_at || d.created_at || new Date().toISOString(),
              }))
            : pageIndex === 0
            ? MOCK_NOTIFICATIONS
            : [];

        if (isRefresh || pageIndex === 0) {
          setNotifications(fetchedItems);
        } else {
          setNotifications((prev) => [...prev, ...fetchedItems]);
        }

        setHasMore(fetchedItems.length === PAGE_SIZE);
        setPage(pageIndex);
      } catch (err) {
        console.warn('Error fetching notifications:', err);
        if (pageIndex === 0) {
          setNotifications(MOCK_NOTIFICATIONS);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [childId]
  );

  useEffect(() => {
    fetchNotifications(0);
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(0, true);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  // Helper to detect risk in a notification
  const isRiskNotification = (item: NotificationLog): boolean => {
    const text = `${item.title} ${item.message}`.toLowerCase();
    return (
      text.includes('idiota') ||
      text.includes('tonto') ||
      text.includes('odio') ||
      text.includes('pelea') ||
      text.includes('foto') ||
      text.includes('droga') ||
      text.includes('secreto') ||
      text.includes('amenaza')
    );
  };

  // Filtered & Searched data
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Filter by chip category
      if (selectedFilter === 'WHATSAPP' && !n.appName.toLowerCase().includes('whatsapp')) {
        return false;
      }
      if (selectedFilter === 'TIKTOK' && !n.appName.toLowerCase().includes('tiktok')) {
        return false;
      }
      if (selectedFilter === 'RIESGO' && !isRiskNotification(n)) {
        return false;
      }

      // 2. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchApp = n.appName.toLowerCase().includes(query);
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchMessage = n.message.toLowerCase().includes(query);
        return matchApp || matchTitle || matchMessage;
      }

      return true;
    });
  }, [notifications, selectedFilter, searchQuery]);

  // App icon and color provider
  const getAppMeta = (appName: string) => {
    const lower = appName.toLowerCase();
    if (lower.includes('whatsapp')) {
      return { icon: 'logo-whatsapp' as const, color: '#25D366', bg: 'rgba(37, 211, 102, 0.15)' };
    }
    if (lower.includes('tiktok')) {
      return { icon: 'logo-tiktok' as const, color: '#EE1D52', bg: 'rgba(238, 29, 82, 0.15)' };
    }
    if (lower.includes('instagram')) {
      return { icon: 'logo-instagram' as const, color: '#E1306C', bg: 'rgba(225, 48, 108, 0.15)' };
    }
    if (lower.includes('youtube')) {
      return { icon: 'logo-youtube' as const, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    }
    return { icon: 'notifications-outline' as const, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
  };

  const renderItem = ({ item }: { item: NotificationLog }) => {
    const meta = getAppMeta(item.appName);
    const hasRisk = isRiskNotification(item);

    return (
      <View style={[styles.cardItem, hasRisk && styles.cardItemRisk]}>
        <View style={[styles.appIconCircle, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.appNameBadge}>
              <Text style={[styles.appNameBadgeText, { color: meta.color }]}>{item.appName}</Text>
            </View>

            {hasRisk && (
              <View style={styles.riskBadge}>
                <Ionicons name="warning" size={11} color="#EF4444" />
                <Text style={styles.riskBadgeText}>Alerta</Text>
              </View>
            )}

            <Text style={styles.timeText}>{formatRelativeTime(item.receivedAt)}</Text>
          </View>

          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifMessage}>{item.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Historial de Notificaciones</Text>
          <Text style={styles.headerSubtitle}>Registro completo de alertas recibidas</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por mensaje, remitente o app..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips / Pills */}
      <View style={styles.filterRow}>
        {(['TODAS', 'WHATSAPP', 'TIKTOK', 'RIESGO'] as FilterType[]).map((filter) => {
          const isSelected = selectedFilter === filter;
          const label =
            filter === 'TODAS'
              ? 'Todas'
              : filter === 'WHATSAPP'
              ? 'WhatsApp'
              : filter === 'TIKTOK'
              ? 'TikTok'
              : 'Alertas de Riesgo';

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                isSelected && styles.filterPillActive,
                filter === 'RIESGO' && isSelected && styles.filterPillRiskActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.7}
            >
              {filter === 'RIESGO' && (
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#EF4444'}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.filterPillText,
                  isSelected && styles.filterPillTextActive,
                  filter === 'RIESGO' && !isSelected && { color: '#EF4444' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Cargando historial de notificaciones...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38BDF8" />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#38BDF8" />
                <Text style={styles.footerLoaderText}>Cargando más notificaciones...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-sleep-outline" size={48} color="#475569" />
              <Text style={styles.emptyTitle}>No se encontraron notificaciones</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Las nuevas notificaciones recibidas en el teléfono aparecerán aquí.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 17,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '500',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  filterPillRiskActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  filterPillText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  cardItemRisk: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(30, 15, 25, 0.65)',
  },
  appIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appNameBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  appNameBadgeText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  riskBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 'auto',
  },
  notifTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 14,
    marginBottom: 2,
  },
  notifMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerLoaderText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
});
