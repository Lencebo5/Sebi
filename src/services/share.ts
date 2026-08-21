import * as Sharing from 'expo-sharing';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { Affirmation } from '@/models/types';
import { track } from '@/services/analytics';

/**
 * Capture the offscreen ShareCard view as a 1080×1350 PNG and open the
 * native share sheet.
 */
export async function shareAffirmationCard(
  cardRef: React.RefObject<View | null>,
  affirmation: Affirmation,
): Promise<void> {
  track('affirmation_shared', { id: affirmation.id });

  if (Platform.OS === 'web') {
    // No view-shot on web — share the text itself.
    await Share.share({ message: affirmation.text });
    return;
  }

  const uri = await captureRef(cardRef, {
    format: 'png',
    quality: 1,
    width: 1080,
    height: 1350,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: affirmation.text });
  } else {
    await Share.share({ message: affirmation.text, url: uri });
  }
}
