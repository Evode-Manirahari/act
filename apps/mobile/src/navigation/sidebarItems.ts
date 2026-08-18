import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SidebarNavItem } from '../components/ActSidebar';
import type { PilotStackParamList } from './PilotNavigator';

type NavProp = NativeStackNavigationProp<PilotStackParamList>;

/**
 * The drawer's destination list, in the order the pilot actually runs:
 * record → debrief → review → train. Badges are optional so screens that
 * haven't fetched the counts (everything but PilotHome) can omit them.
 *
 * Ask ACT is a destination here, not the headline action — it only answers
 * from published cards, so it is worth nothing until capture and review have
 * produced some.
 */
export function buildDefaultSidebarItems(
  navigation: NavProp,
  onNavigate: () => void,
  badges?: { review?: string; debrief?: string },
  onAsk?: () => void,
): SidebarNavItem[] {
  const items: SidebarNavItem[] = [
    {
      key: 'record',
      label: 'Record a job',
      detail: 'Capture the call and mark what matters',
      onPress: () => {
        onNavigate();
        navigation.navigate('CaptureJob');
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
      key: 'learn',
      label: 'Apprentice training',
      detail: 'Open reviewed cards and quick checks',
      onPress: () => {
        onNavigate();
        navigation.navigate('Learn');
      },
    },
  ];

  if (onAsk) {
    items.push({
      key: 'ask',
      label: 'Ask ACT',
      detail: 'Answers from published cards only, with citations',
      onPress: () => {
        onNavigate();
        onAsk();
      },
    });
  }

  return items;
}
