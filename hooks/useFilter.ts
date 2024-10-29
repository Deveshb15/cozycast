import { useCallback, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Filter, NFT } from '../types/filter'
import { LOCAL_STORAGE_KEYS } from '../constants/Farcaster'
import { eventEmitter } from '../utils/event'

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
    setFilter(newFilter)
    await AsyncStorage.setItem(
      LOCAL_STORAGE_KEYS.FILTERS,
      JSON.stringify(newFilter)
    )
    eventEmitter.emit('filtersUpdated', newFilter)
  }, [])

  const clearFilter = useCallback(async () => {
    await updateFilter(DEFAULT_FILTER)
    setSelectedNFTs([])
  }, [updateFilter])

  const addNFT = useCallback((nft: NFT) => {
    setSelectedNFTs(prev => [...prev, nft])
  }, [])

  const removeNFT = useCallback((nftId: string) => {
    setSelectedNFTs(prev => prev.filter(nft => nft.id !== nftId))
  }, [])

  return {
    filter,
    selectedNFTs,
    updateFilter,
    clearFilter,
    addNFT,
    removeNFT
  }
} 