import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SidebarNavItem } from '../components/ActSidebar';
import type { PilotStackParamList } from './PilotNavigator';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

/**
 * The sidebar's "Workspace" list — the same real destinations every screen's
 * ActAppShell hamburger opens into. Badges are optional so screens that
 * haven't fetched the counts (everything but PilotHome) can omit them.
 */
export function buildDefaultSidebarItems(
  navigation: NavProp,
  onNavigate: () => void,
  badges?: { review?: string; debrief?: string },
): SidebarNavItem[] {
  return [
    {
      key: 'record',
      label: 'Record senior tech',
      detail: 'Capture the call and mark what matters',
      onPress: () => {
        onNavigate();
        navigation.navigate('CaptureJob');
      },
    },
    {
      key: 'learn',
      label: 'Apprentice training',
      detail: 'Open reviewed cards and quick checks',
      onPress: () => {
        onNavigate();
        navigation.navigate('Learn');
      },
    },
    {
      key: 'review',
      label: 'Review queue',
      detail: 'Approve moments across ready recordings',
      badge: badges?.review,
      onPress: () => {
        onNavigate();
        navigation.navigate('PilotReview', { queue: true });
      },
    },
    {
      key: 'debrief',
      label: 'Answer debrief',
      detail: '30 seconds in your own words builds the card',
      badge: badges?.debrief,
      onPress: () => {
        onNavigate();
        navigation.navigate('Debrief');
      },
    },
  ];
}
