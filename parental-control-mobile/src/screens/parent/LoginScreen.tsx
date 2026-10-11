import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ParentStackParamList } from '../../types';
import { supabase } from '../../config/supabase';
import { storageService } from '../../services/storageService';
import { theme } from '../../theme/theme';

// Handle completing auth session for Web/Deep linking
WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'Login'>;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'oauth' | 'email'>('oauth');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Pulsing electric cyan halo animation behind logo
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.7);

  useEffect(() => {
    haloScale.value = withRepeat(
      withTiming(1.4, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
    haloOpacity.value = withRepeat(
      withTiming(0, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }), [haloScale, haloOpacity]);

  const syncParentRecord = async (
    userId: string,
    userEmail: string,
    name: string,
    avatar: string
  ) => {
    try {
      // 1. Create or retrieve parent in Supabase 'parents' table
      const { error } = await supabase
        .from('parents')
        .upsert({
          id: userId,
          email: userEmail,
          name: name,
          admin_pin: '0000',
        });

      if (error) {
        console.warn('Note: parent upsert note:', error.message);
      }

      // 2. Persist session parent ID and user role
      await storageService.saveParentId(userId);
      await storageService.saveUserRole('parent');
    } catch (err) {
      console.error('Error syncing parent record:', err);
      await storageService.saveParentId(userId);
      await storageService.saveUserRole('parent');
    }
  };

  // Global listener for Supabase authentication state
  useEffect(() => {
    // 1. Check if session already exists (e.g. following OAuth redirect)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        const u = data.session.user;
        syncParentRecord(
          u.id,
          u.email || 'padre@kibbo.app',
          u.user_metadata?.full_name || 'Padre de Familia',
          u.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/bottts/png?seed=parent'
        );
        navigation.reset({
          index: 0,
          routes: [{ name: 'ParentDashboard' }],
        });
      }
    });

    // 2. Realtime auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncParentRecord(
          session.user.id,
          session.user.email || 'padre@kibbo.app',
          session.user.user_metadata?.full_name || 'Padre de Familia',
          session.user.user_metadata?.avatar_url || 'https://api.dicebear.com/7.x/bottts/png?seed=parent'
        );
        navigation.reset({
          index: 0,
          routes: [{ name: 'ParentDashboard' }],
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigation]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'kibbo',
        preferLocalhost: true,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        Alert.alert('Google Sign-In', error.message);
        setGoogleLoading(false);
        return;
      }

      if (Platform.OS === 'web') {
        if (data?.url) {
          window.location.href = data.url;
        }
      } else if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          // Deep link session will be caught by onAuthStateChange
        }
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      Alert.alert('Error de Autenticación', err.message || 'No se pudo conectar con Google.');
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Register new parent in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim() || 'Padre / Tutor',
            },
          },
        });

        if (error) {
          Alert.alert('Error al registrarse', error.message);
          return;
        }

        if (data?.user) {
          await syncParentRecord(
            data.user.id,
            data.user.email || email.trim(),
            fullName.trim() || 'Padre / Tutor',
            'https://api.dicebear.com/7.x/bottts/png?seed=parent'
          );
          Alert.alert(
            'Cuenta Creada',
            'Tu cuenta en Supabase ha sido creada correctamente.'
          );
        }
      } else {
        // Sign in existing parent in Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          Alert.alert('Error al iniciar sesión', error.message);
          return;
        }

        if (data?.user) {
          await syncParentRecord(
            data.user.id,
            data.user.email || email.trim(),
            data.user.user_metadata?.full_name || 'Padre de Familia',
            'https://api.dicebear.com/7.x/bottts/png?seed=parent'
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Error de Autenticación', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRoles = async () => {
    await storageService.saveUserRole(null);
    // @ts-ignore
    navigation.getParent()?.replace('RoleSelection');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Navigation */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToRoles}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Acceso de Padres</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Brand Card */}
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.halo, animatedHaloStyle]} />
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.title}>Kibbo - Seguridad Familiar</Text>
          <Text style={styles.subtitle}>
            Inicia sesión con tu cuenta oficial para supervisar dispositivos en tiempo real y definir reglas parentales.
          </Text>

          {/* Feature highlights */}
          <View style={styles.featuresBox}>
            <View style={styles.featureRow}>
              <Ionicons name="shield-checkmark" size={18} color={theme.colors.parentAccent} />
              <Text style={styles.featureText}>Protección y cifrado de datos de nivel bancario.</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="location" size={18} color={theme.colors.parentAccent} />
              <Text style={styles.featureText}>Supervisión GPS en tiempo real y alertas de ubicación.</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.parentAccent} />
              <Text style={styles.featureText}>Monitoreo continuo con atención prioritaria ante Botón SOS.</Text>
            </View>
          </View>
        </View>

        {/* Auth Mode Switch: Google vs Email/Password */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'oauth' && styles.modeTabActive]}
            onPress={() => setAuthMode('oauth')}
          >
            <Text style={[styles.modeTabText, authMode === 'oauth' && styles.modeTabTextActive]}>
              Google
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, authMode === 'email' && styles.modeTabActive]}
            onPress={() => setAuthMode('email')}
          >
            <Text style={[styles.modeTabText, authMode === 'email' && styles.modeTabTextActive]}>
              Correo y Contraseña
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auth Actions Container */}
        <View style={styles.actions}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.parentAccent} style={{ marginVertical: 20 }} />
          ) : authMode === 'oauth' ? (
            <>
              {/* Google OAuth Button */}
              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                activeOpacity={0.88}
                disabled={googleLoading || loading}
                onPress={handleGoogleSignIn}
              >
                {googleLoading ? (
                  <View style={styles.googleLoadingRow}>
                    <ActivityIndicator size="small" color="#EA4335" />
                    <Text style={styles.googleButtonText}>Iniciando sesión...</Text>
                  </View>
                ) : (
                  <View style={styles.googleLoadingRow}>
                    <FontAwesome name="google" size={20} color="#EA4335" />
                    <Text style={styles.googleButtonText}>Continuar con Google</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.oauthHint}>
                Acceso rápido y seguro mediante tu cuenta de Google.
              </Text>
            </>
          ) : (
            <View style={styles.emailForm}>
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre completo</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. Roberto Gomez"
                    placeholderTextColor={theme.colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="padre@ejemplo.com"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                activeOpacity={0.88}
                onPress={handleEmailAuth}
              >
                <Ionicons
                  name={isSignUp ? 'person-add-outline' : 'log-in-outline'}
                  size={20}
                  color={theme.colors.white}
                />
                <Text style={styles.submitButtonText}>
                  {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleSignUpBtn}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.toggleSignUpText}>
                  {isSignUp
                    ? '¿Ya tienes cuenta? Inicia sesión'
                    : '¿No tienes cuenta? Regístrate aquí'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.disclaimer}>
            Kibbo • Seguridad y protección familiar garantizada.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  topBarTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    width: 90,
    height: 90,
  },
  halo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 0,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.borderParent,
    overflow: 'hidden',
    zIndex: 2,
    ...theme.shadows.glowParent,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontSize: 22,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  featuresBox: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 13,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  modeTabActive: {
    backgroundColor: theme.colors.parentAccent,
  },
  modeTabText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  googleButtonDisabled: {
    opacity: 0.75,
  },
  googleLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    ...theme.typography.button,
    color: '#1E293B',
    fontWeight: '700',
  },
  oauthHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  emailForm: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.parentAccent,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    marginTop: 6,
    ...theme.shadows.glowParent,
  },
  submitButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontSize: 14,
  },
  toggleSignUpBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleSignUpText: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '600',
  },
  disclaimer: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
