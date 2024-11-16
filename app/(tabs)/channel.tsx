import { FlashList } from '@shopify/flash-list'
import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
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
  
  const { casts, isLoading, loadMore, isReachingEnd } = useLatestCasts(
    type,
    parent_url,
    fid,
  )

  const fetchNFTHolders = useCallback(async (nft: any) => {
    try {
      const response = await axios.get(`${API_URL}/nft-holders/${nft.address}`)
      return response.data
    } catch (error) {
      console.error('Error fetching NFT holders:', error)
      return { feed: { casts: [] } }
    }
  }, [])

  // Memoize the filtered casts to prevent unnecessary recalculations
  const applyFilters = useCallback(async (castsToFilter: any[]) => {
    if (!castsToFilter?.length) return []
    
    // Don't process if we already have these casts
    const existingHashes = new Set(feed.map(cast => cast.hash))
    const newCasts = castsToFilter.filter(cast => !existingHashes.has(cast.hash))
    
    if (!newCasts.length) return feed

    let filtered = [...newCasts]

    // Apply filters in sequence
    if (filter.lowerFid || filter.upperFid) {
      filtered = filterFeedBasedOnFID(filtered, filter.lowerFid, filter.upperFid)
    }

    if (filter.showChannels?.length > 0) {
      filtered = filterCastsBasedOnChannels(filtered, filter.showChannels)
    }

    if (filter.mutedChannels?.length > 0) {
      filtered = filterCastsToMute(filtered, filter.mutedChannels)
    }

    if (filter.isPowerBadgeHolder) {
      filtered = filtered.filter(cast => cast.author?.power_badge === true)
    }

    // Handle NFT filters separately to avoid race conditions
    if (filter.nfts?.length > 0) {
      const nftResults = await Promise.all(
        filter.nfts.map((nft: any) => fetchNFTHolders(nft))
      )
      const nftFeed = nftResults
        .flatMap(result => result?.feed?.casts || [])
        .filter(Boolean)
        .filter(cast => !existingHashes.has(cast.hash))

      return [...feed, ...nftFeed, ...filtered]
    }

    return [...feed, ...filtered]
  }, [feed, filter, fetchNFTHolders])

  const onEndReached = useCallback(() => {
    if (!isReachingEnd) {
      loadMore()
    }
  }, [isReachingEnd, loadMore])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const processFeeds = async () => {
      if (!casts?.length) return
      
      // Debounce the filter application
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        const filteredCasts = await applyFilters(casts)
        if (mounted && filteredCasts?.length > 0) {
          setFeed(filteredCasts)
        }
      }, 300)
    }

    processFeeds()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [casts, filter])

  // Update the filter change handler
  useEffect(() => {
    const handleFilterChange = (newFilter: Filter) => {
      // Don't trigger a re-render if the filter hasn't actually changed
      if (JSON.stringify(filter) === JSON.stringify(newFilter)) return
      
      setFilter(newFilter)
      setFeed([]) // Reset feed only when filter actually changes
    }

    eventEmitter.on('filtersUpdated', handleFilterChange)
    eventEmitter.on('filterChanged', handleFilterChange)

    return () => {
      eventEmitter.off('filtersUpdated', handleFilterChange)
      eventEmitter.off('filterChanged', handleFilterChange)
    }
  }, [filter, setFilter])

  // Update handleApply to work consistently across platforms
  const handleApply = useCallback(() => {
    const newFilter = {
      lowerFid: 0,
      upperFid: Infinity,
      showChannels: [],
      mutedChannels: [],
      isPowerBadgeHolder: false,
      nfts: [],
      includeRecasts: true
    }
    
    if (Platform.OS === 'web') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(newFilter))
    } else {
      AsyncStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(newFilter))
    }
    
    setFilter(newFilter)
    eventEmitter.emit('filterChanged', newFilter)
  }, [setFilter])

  console.log("FEED ", feed.length)

  return (
    <View style={styles.container}>
      {feed && feed.length > 0 && !isLoading ? (
        <FlashList
          contentContainerStyle={styles.flashList}
          data={[...feed].reverse()}
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
