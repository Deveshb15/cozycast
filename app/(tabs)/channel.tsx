import { FlashList } from '@shopify/flash-list'
import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native'
import { useRoute } from '@react-navigation/native'
import Cast from '../../components/Cast'
import { useLatestCasts } from '../../hooks/useLatestsCasts'
import useAppContext from '../../hooks/useAppContext'
import {
  filterCastsBasedOnChannels,
  filterFeedBasedOnFID,
  filterCastsToMute,
} from '../../utils/functions'
import { eventEmitter } from '../../utils/event'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCAL_STORAGE_KEYS } from '../../constants/Farcaster'
import axios from 'axios'
import { API_URL } from '../../constants'
import { Filter } from '../../types/filter'

const ChannelScreen = () => {
  const route = useRoute<any>()
  const { filter, setFilter } = useAppContext()
  const { type, parent_url, fid } = route.params
  const [feed, setFeed] = useState<any[]>([])
  const [isFilterChanged, setIsFilterChanged] = useState(false)
  const [tokenFeed, setTokenFeed] = useState<any[]>([])

  const { casts, isLoading, loadMore, isReachingEnd } = useLatestCasts(
    type,
    parent_url,
    fid,
  )

  const fetchNFTHolders = async (nft: any) => {
    try {
      const response = await axios.get(`${API_URL}/nft-holders/${nft.address}`)
      // console.log("NFT holders response:", response.data);
      return response.data?.feed?.casts || []
      
    } catch (error) {
      console.error('Error fetching NFT holders:', error)
      return []
    }
  }

  const onEndReached = useCallback(() => {
    if (!isReachingEnd) {
      loadMore()
    }
  }, [isReachingEnd, loadMore])

  const applyFilters = useCallback((castsToFilter: any[]) => {
    if (!castsToFilter?.length) return []
    
    console.log("FILTERS ", JSON.stringify(filter, null, 2))
    let filtered = [...castsToFilter]

    console.log('FILTERED 0 len', filtered.length)
    // Apply FID filter
    filtered = filtered.filter(cast => {
      const fid = cast?.author?.fid
      const lowerFid = filter.lowerFid || 0
      const upperFid = filter.upperFid === null ? Infinity : filter.upperFid
      return fid >= lowerFid && fid <= upperFid
    })

    console.log('FILTERED 1 len', filtered.length)

    // Apply channel filters - only if channels are selected
    if (filter.showChannels?.length > 0) {
      filtered = filtered.filter(cast => {
        const channelId = cast?.parent_url?.split('/').pop()?.toLowerCase()
        return channelId && filter.showChannels.some((c: string) => c.toLowerCase() === channelId)
      })
    }

    console.log('FILTERED 2 len', filtered.length)

    // Apply muted channels
    if (filter.mutedChannels?.length > 0) {
      filtered = filtered.filter(cast => {
        const channelId = cast?.parent_url?.split('/').pop()?.toLowerCase()
        return !filter.mutedChannels.some((c: string) => c.toLowerCase() === channelId)
      })
    }

    console.log('FILTERED 3 len', filtered.length)

    // Apply power badge filter
    if (filter.isPowerBadgeHolder) {
      filtered = filtered.filter(cast => cast.author?.power_badge)
    }

    console.log('FILTERED 4 len', filtered.length)

    // Apply recast filter
    if (!filter.includeRecasts) {
      filtered = filtered.filter(cast => !cast?.reaction?.recasts?.length)
    }

    console.log('FILTERED 5 len', filtered.length)

    return filtered
  }, [filter])

  useEffect(() => {
    if (casts?.length > 0) {
      console.log("Applying filters to casts:", casts.length);
      console.log("Current filter:", filter);
      const filteredCasts = applyFilters(casts);
      console.log("Filtered casts:", filteredCasts.length);
      setFeed(filteredCasts);
    }
  }, [casts, filter, applyFilters, isFilterChanged]);

  useEffect(() => {
    const handleFilterChange = (newFilter : Filter) => {
      setFilter(newFilter);
      setIsFilterChanged(prev => !prev);
    }

    eventEmitter.on('filtersUpdated', handleFilterChange);
    eventEmitter.on('filterChanged', handleFilterChange);

    return () => {
      eventEmitter.off('filtersUpdated', handleFilterChange);
      eventEmitter.off('filterChanged', handleFilterChange);
    }
  }, [setFilter]);

  const handleApply = () => {
    let newFilter = {
      lowerFid: 0,
      upperFid: Infinity,
      showChannels: [],
      mutedChannels: [],
      isPowerBadgeHolder: false,
      nfts: [],
      includeRecasts: true
    }
    setFilter(newFilter)
    console.log('NEW FILTER', newFilter)
    AsyncStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(newFilter))
    eventEmitter.emit('filterChanged', newFilter)
  }

  return (
    <View style={styles.container}>
      {feed && feed.length > 0 && !isLoading ? (
        <FlashList
          contentContainerStyle={styles.flashList}
          data={feed.reverse()}
          renderItem={({ item, index }) => <Cast key={index} cast={item} />}
          keyExtractor={(_, index) => index.toString()}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.1}
          estimatedItemSize={100}
          ListFooterComponent={() =>
            isLoading && !isReachingEnd ? (
              <ActivityIndicator size="large" color="#000000" />
            ) : null
          }
          refreshing={isLoading}
          onRefresh={loadMore}
        />
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : (
        <View style={styles.noContentContainer}>
          <Text style={styles.noContentText}>
            No casts for the current filter.
          </Text>
          <Text style={styles.noContentText}>
            Try tweaking your filter or head back to the default view by
            resetting?
          </Text>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'space-between',
  },
  flashList: {
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: 'SpaceMono',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  noContentText: {
    color: 'black',
    fontSize: 24,
    marginBottom: 20,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
})

export default React.memo(ChannelScreen)
