import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'default' | 'parent' | 'child' | 'danger';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'parent' && styles.parent,
        variant === 'child' && styles.child,
        variant === 'danger' && styles.danger,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  parent: {
    borderColor: theme.colors.borderParent,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.parentAccent,
  },
  child: {
    borderColor: theme.colors.borderChild,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.childAccent,
  },
  danger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
});
