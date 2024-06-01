import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import Cast from '../../components/Cast';
import { useLatestCasts } from '../../hooks/useLatestsCasts';
import useAppContext from '../../hooks/useAppContext';
import { filterCastsBasedOnChannels, filterFeedBasedOnFID, filterCastsToMute } from '../../utils/functions';

const ChannelScreen = () => {
  const route = useRoute<any>();
  const { filter } = useAppContext();
  const { type, parent_url, fid } = route.params;

  const { casts, isLoading, loadMore, isReachingEnd } = useLatestCasts(type, parent_url, fid);

  const onEndReached = useCallback(() => {
    if (!isReachingEnd) {
      loadMore();
    }
  }, [isReachingEnd, loadMore]);

  const feed: NeynarCastV2[] = useMemo(() => {
    if (type === 'channel' && fid) {
      let filteredCasts = filterFeedBasedOnFID(casts, filter.lowerFid, filter.upperFid);
      if (filter.showChannels?.length > 0) {
        filteredCasts = filterCastsBasedOnChannels(filteredCasts, filter.showChannels);
      }
      if (filter.mutedChannels?.length > 0) {
        filteredCasts = filterCastsToMute(filteredCasts, filter.mutedChannels);
      }
      return filteredCasts;
    }
    return casts;
  }, [casts, filter, type, fid]);

  // console.log("FILTER ", JSON.stringify(filter, null, 2))

  return (
    <View style={styles.container}>
      <FlashList
        contentContainerStyle={styles.flashList}
        data={feed}
        renderItem={({ item, index }) => <Cast key={index} cast={item} />}
        keyExtractor={(_, index) => index.toString()}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() =>
          isLoading && !isReachingEnd ? <ActivityIndicator size="large" color="#000000" /> : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'space-between',
  },
  flashList: {
    backgroundColor: '#fff',
  },
});

export default React.memo(ChannelScreen);