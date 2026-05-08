import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';

export function useDiscardGuard(isDirty: boolean) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert(
        t('common.discardTitle'),
        t('common.discardMessage'),
        [
          { text: t('common.keepEditing'), style: 'cancel' },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsub;
  }, [navigation, isDirty, t]);
}
