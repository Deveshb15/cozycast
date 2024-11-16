import { useCallback, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Filter, NFT } from '../types/filter'
import { LOCAL_STORAGE_KEYS } from '../constants/Farcaster'
import { eventEmitter } from '../utils/event'
import { Platform } from 'react-native'

const DEFAULT_FILTER: Filter = {
  lowerFid: 0,
  upperFid: Infinity,
  showChannels: [],
  mutedChannels: [],
  isPowerBadgeHolder: false,
  nftFilters: [],
  nfts: [],
  includeRecasts: true
}

export const useFilter = () => {
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER)
  const [selectedNFTs, setSelectedNFTs] = useState<NFT[]>([])

  const updateFilter = useCallback(async (newFilter: Filter) => {
    try {
      setFilter(newFilter)
      setSelectedNFTs(newFilter.nfts || [])
      
      // Handle web storage differently
      if (Platform.OS === 'web') {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(newFilter))
      } else {
        await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.FILTERS, JSON.stringify(newFilter))
      }
      eventEmitter.emit('filtersUpdated', newFilter)
    } catch (error) {
      console.error('Error saving filters:', error)
    }
  }, [])

  // Load initial filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        let savedFilters
        if (Platform.OS === 'web') {
          savedFilters = localStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS)
        } else {
          savedFilters = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS)
        }
        
        if (savedFilters) {
          const parsedFilters = JSON.parse(savedFilters)
          setFilter(parsedFilters)
          setSelectedNFTs(parsedFilters.nfts || [])
        }
      } catch (error) {
        console.error('Error loading filters:', error)
      }
    }
    loadFilters()
  }, [])

  const clearFilter = useCallback(async () => {
    await updateFilter(DEFAULT_FILTER)
    setSelectedNFTs([])
  }, [updateFilter])

  return {
    filter,
    selectedNFTs,
    updateFilter,
    clearFilter
  }
} 