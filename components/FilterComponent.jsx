import React, { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useAppContext from '../hooks/useAppContext'
import { useSearchChannel } from '../hooks/useSearchChannels'
import { debounce, set } from 'lodash'
import { LOCAL_STORAGE_KEYS } from '../constants/Farcaster'
import toast from 'react-hot-toast/headless'
import { eventEmitter } from '../utils/event'
import axios from 'axios'

const FilterModal = ({ visible, onClose }) => {
  const { filter, setFilter, setFilterChange } = useAppContext()
  const [minFID, setMinFID] = useState(0)
  const [maxFID, setMaxFID] = useState(Infinity)
  const [searchChannels, setSearchChannels] = useState('')
  const [muteChannels, setMuteChannels] = useState('')
  const [fetchedChannels, setFetchedChannels] = useState([])
  const [fetchedMutedChannels, setFetchedMutedChannels] = useState([])
  const [selectedChannels, setSelectedChannels] = useState([])
  const [selectedMutedChannels, setSelectedMutedChannels] = useState([])
  const [isPowerBadgeHolder, setIsPowerBadgeHolder] = useState(false)
  const [nftSearchQuery, setNftSearchQuery] = useState('')
  const [nftSearchResults, setNftSearchResults] = useState([])
  const [selectedNFTs, setSelectedNFTs] = useState([])
  const [tokenGatedData, setTokenGatedData] = useState()
  const [loading, setLoading] = useState(false)
  const [contractAddress, setContractAddress] = useState('')
  const [contractMetadata, setContractMetadata] = useState(null)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)

  const handleClearAll = useCallback(() => {
    toast('Filters Removd', {
      icon: '❌',
    })
    setMinFID(0)
    setMaxFID(Infinity)
    setSearchChannels('')
    setMuteChannels('')
    setSelectedChannels([])
    setSelectedMutedChannels([])
    setSelectedNFTs([])
    setFilter({
      lowerFid: 0,
      upperFid: Infinity,
      showChannels: [],
      mutedChannels: [],
      isPowerBadgeHolder: false,
      nftFilters: [],
      nfts: [],
    })
    AsyncStorage.setItem(
      LOCAL_STORAGE_KEYS.FILTERS,
      JSON.stringify({
        lowerFid: 0,
        upperFid: Infinity,
        showChannels: [],
        mutedChannels: [],
        isPowerBadgeHolder: false,
        nftFilters: [],
        nfts: [],
      }),
    )
    setFilterChange((prev) => !prev)
  }, [])

  const updateFilter = useCallback(
    (newFilter) => {
      setFilter(newFilter)
      AsyncStorage.setItem(
        LOCAL_STORAGE_KEYS.FILTERS,
        JSON.stringify(newFilter),
      )
      setFilterChange((prev) => !prev)
    },
    [setFilter],
  )

  const handleSetMaxFID = (text) => {
    const numericValue = parseFloat(text)
    setMaxFID(!isNaN(numericValue) ? numericValue : '')
  }

  const handleApply = useCallback(() => {
    console.log("handleApply called");
    toast('Filters Applied', {
      icon: '🔥',
    })
    // console.log("SELECTED NFTs ", selectedNFTs)
    const newFilter = {
      ...filter,
      lowerFid: minFID,
      upperFid: maxFID,
      showChannels: [...selectedChannels],
      mutedChannels: [...selectedMutedChannels],
      isPowerBadgeHolder,
      nftFilters: selectedNFTs.map((nft) => ({
        id: nft.id,
        name: nft.name,
        address: nft.address,
        holders: nft.holders,
      })),
      nfts: selectedNFTs,
    }
    // console.log("New filter being applied:", JSON.stringify(newFilter));
    updateFilter(newFilter)
    // Emit an event to notify other components about the filter change
    // console.log("Emitting filtersUpdated event");
    eventEmitter.emit('filtersUpdated', newFilter)
    onClose()
  }, [
    filter,
    minFID,
    maxFID,
    selectedChannels,
    selectedMutedChannels,
    isPowerBadgeHolder,
    selectedNFTs,
    onClose,
    updateFilter,
  ])

  useEffect(() => {
    const fetchFilters = async () => {
      // setLoading(true);
      const filters = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS)
      if (filters) {
        const parsedFilters = JSON.parse(filters)
        setFilter(parsedFilters)
        setMinFID(parsedFilters.lowerFid)
        setMaxFID(parsedFilters.upperFid)
        setSelectedChannels(parsedFilters.showChannels)
        setSelectedMutedChannels(parsedFilters.mutedChannels)
        setFilterChange((prev) => !prev)
        setIsPowerBadgeHolder(parsedFilters.isPowerBadgeHolder)
        setSelectedNFTs(parsedFilters.nfts || [])
      }
      // setLoading(false);
    }
    fetchFilters()
  }, [setFilter])

  const debouncedSearch = useCallback(
    debounce(async (text) => {
      const { channels } = await useSearchChannel(text)
      setFetchedChannels(channels)
    }, 1000),
    [],
  )

  useEffect(() => {
    if (searchChannels?.length > 0) {
      debouncedSearch(searchChannels)
    }
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchChannels, debouncedSearch])

  const debouncedMuteSearch = useCallback(
    debounce(async (text) => {
      const { channels } = await useSearchChannel(text)
      setFetchedMutedChannels(channels)
    }, 1000),
    [],
  )

  useEffect(() => {
    if (muteChannels?.length > 0) {
      debouncedMuteSearch(muteChannels)
    }
    return () => {
      debouncedMuteSearch.cancel()
    }
  }, [muteChannels, debouncedMuteSearch])

  const handleAddChannel = (channel) => {
    setSearchChannels('')
    setSelectedChannels([...selectedChannels, channel.id])
    setFetchedChannels([])
  }

  const handleAddMuteChannel = (channel) => {
    setMuteChannels('')
    setSelectedMutedChannels([...selectedMutedChannels, channel.id])
    setFetchedMutedChannels([])
  }

  useEffect(() => {
    const handleApplyFilter = (newFilter) => {
      updateFilter(newFilter)
      AsyncStorage.setItem(
        LOCAL_STORAGE_KEYS.FILTERS,
        JSON.stringify(newFilter),
      )
      setMaxFID(newFilter.upperFid)
      setMinFID(newFilter.lowerFid)
      setSelectedChannels(newFilter.showChannels)
      setSelectedMutedChannels(newFilter.mutedChannels)
      setFilterChange((prev) => !prev)
      setIsPowerBadgeHolder(newFilter.isPowerBadgeHolder)
      setSelectedNFTs(newFilter.nfts)
      // Emit an event to notify other components about the filter change
      eventEmitter.emit('filtersUpdated', newFilter)
    }

    eventEmitter.on('filterChanged', handleApplyFilter)

    return () => {
      eventEmitter.off('filterChanged', handleApplyFilter)
    }
  }, [updateFilter])

  const debouncedNFTSearch = useCallback(
    debounce(async (query) => {
      // This is a placeholder. In a real implementation, you'd call an API to search for NFTs
      const mockResults = [
        {
          id: '1',
          name: 'Alpaca NFT',
          address: '0x03ad6cd7410ce01a8b9ed26a080f8f9c1d7cc222',
        },
        {
          id: '2',
          name: 'Bored Ape Yacht Club',
          address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        },
        {
          id: '3',
          name: 'Nouns',
          address: '0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03',
        },
        {
          id: '4',
          name: 'CryptoPunks',
          address: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
        },

        // Add more mock results as needed
      ].filter((nft) => nft.name.toLowerCase().includes(query.toLowerCase()))
      setNftSearchResults(mockResults)
    }, 300),
    [],
  )

  useEffect(() => {
    if (nftSearchQuery) {
      debouncedNFTSearch(nftSearchQuery)
    } else {
      setNftSearchResults([])
    }
  }, [nftSearchQuery, debouncedNFTSearch])

  const handleAddNFT = async (nft) => {
    setLoading(true)
    console.log("Adding NFT to filter:", nft)
    setSelectedNFTs([...selectedNFTs, nft])
    setNftSearchQuery('')
    setLoading(false)
  }

  const handleRemoveNFT = (nftId) => {
    setTokenGatedData()
    setSelectedNFTs(selectedNFTs.filter((nft) => nft.id !== nftId))
  }

  const fetchContractMetadata = useCallback(async (address) => {
    // console.log("Fetching metadata for address:", address);
    setIsLoadingMetadata(true);
    try {
      let apiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY
      const response = await axios.get(`https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getContractMetadata`, {
        params: { contractAddress: address }
      });
      // console.log("Full metadata received:", JSON.stringify(response.data, null, 2));
      setContractMetadata(response.data);
    } catch (error) {
      console.error('Error fetching contract metadata:', error);
      Alert.alert('Error', 'Failed to fetch contract metadata. Please check the address and try again.');
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []);


  const handleContractAddressChange = useCallback((text) => {
    // console.log("Contract address changed to:", text);
    setContractAddress(text);
    if (text.length === 42 && text.startsWith('0x')) {
      fetchContractMetadata(text);
    } else {
      setContractMetadata(null);
    }
  }, [fetchContractMetadata]);

  const handleAddContractNFT = () => {
    if (contractMetadata) {
      const newNFT = {
        id: contractAddress,
        name: contractMetadata.name || 'Unknown Name',
        address: contractAddress,
      };
      setSelectedNFTs([...selectedNFTs, newNFT]);
      setContractAddress('');
      setContractMetadata(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color="black" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            <Text style={styles.header}>Filter</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>FID Range</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text>Min</Text>
                  <TextInput
                    style={styles.input}
                    value={minFID?.toString()}
                    onChangeText={(text) => setMinFID(Number(text))}
                    keyboardType="numeric"
                    placeholder="Minimum FID"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text>Max</Text>
                  <TextInput
                    style={styles.input}
                    value={maxFID?.toString() === 'Infinity' ? '' : maxFID?.toString()}
                    onChangeText={handleSetMaxFID}
                    keyboardType="numeric"
                    placeholder="Maximum FID"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>User Type</Text>
              <TouchableOpacity
                onPress={() => setIsPowerBadgeHolder(!isPowerBadgeHolder)}
                style={styles.checkboxContainer}
              >
                <Text style={styles.checkboxText}>
                  {isPowerBadgeHolder ? '✅' : '☐'} Power Badge Holder
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Channel Filters</Text>
              <Text style={styles.subSectionHeader}>Show Channels</Text>
              <TextInput
                style={styles.input}
                value={searchChannels}
                onChangeText={setSearchChannels}
                placeholder="Search channels to show"
              />
              {fetchedChannels?.slice(0, 5).map((channel) => (
                <TouchableOpacity
                  key={channel.id}
                  onPress={() => handleAddChannel(channel)}
                  style={styles.channelContainer}
                >
                  <Image
                    source={{ uri: channel.image_url }}
                    style={styles.channelImage}
                  />
                  <Text>{channel.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.chipContainer}>
                {selectedChannels.map((channel) => (
                  <View key={channel} style={styles.chip}>
                    <Text>{channel}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedChannels(selectedChannels.filter((c) => c !== channel))}
                    >
                      <FontAwesome name="times" size={16} color="black" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Text style={styles.subSectionHeader}>Mute Channels</Text>
              <TextInput
                style={styles.input}
                value={muteChannels}
                onChangeText={setMuteChannels}
                placeholder="Search channels to mute"
              />
              {fetchedMutedChannels.map((channel) => (
                <TouchableOpacity
                  key={channel.id}
                  onPress={() => handleAddMuteChannel(channel)}
                  style={styles.channelContainer}
                >
                  <Image
                    source={{ uri: channel.image_url }}
                    style={styles.channelImage}
                  />
                  <Text>{channel.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.chipContainer}>
                {selectedMutedChannels?.slice(0, 5).map((channel) => (
                  <View key={channel} style={styles.chip}>
                    <Text>{channel}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedMutedChannels(selectedMutedChannels.filter((c) => c !== channel))}
                    >
                      <FontAwesome name="times" size={16} color="black" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>NFT Token Gate</Text>
              <TextInput
                style={styles.input}
                value={nftSearchQuery}
                onChangeText={setNftSearchQuery}
                placeholder="Search for NFTs"
              />
              {nftSearchResults.map((nft) => (
                <TouchableOpacity
                  key={nft.id}
                  onPress={() => handleAddNFT(nft)}
                  style={styles.channelContainer}
                >
                  <Text>{nft.name}</Text>
                </TouchableOpacity>
              ))}
              {loading && <ActivityIndicator size="large" color="#0000ff" />}
              <View style={styles.chipContainer}>
                {selectedNFTs?.map((nft) => (
                  <View key={nft.id} style={styles.chip}>
                    <Text>{nft.name}</Text>
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveNFT(nft.id)}>
                      <FontAwesome name="times" size={16} color="black" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Text style={styles.subSectionHeader}>NFT Contract Address</Text>
              <TextInput
                style={styles.input}
                value={contractAddress}
                onChangeText={handleContractAddressChange}
                placeholder="Enter NFT contract address"
              />
              {isLoadingMetadata && <ActivityIndicator size="small" color="#0000ff" />}
              {contractMetadata && (
                <View style={styles.contractMetadataContainer}>
                  <View style={styles.contractInfoRow}>
                    {contractMetadata.openSeaMetadata?.imageUrl && (
                      <Image
                        source={{ uri: contractMetadata.openSeaMetadata.imageUrl }}
                        style={styles.contractImage}
                      />
                    )}
                    <Text style={styles.contractName}>
                      {contractMetadata.name || 'Unknown'}
                    </Text>
                    <TouchableOpacity onPress={handleAddContractNFT} style={styles.addButtonContainer}>
                      <Text style={styles.addButton}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40, // Add extra padding at the bottom
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add padding to the bottom of the ScrollView content
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subSectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
    color: '#555',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    margin: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  channelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  channelImage: {
    width: 24,
    height: 24,
    borderRadius: 10,
    marginRight: 10,
  },
  contractMetadataContainer: {
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  contractInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  contractName: {
    fontSize: 16,
    flex: 1,
  },
  addButtonContainer: {
    marginLeft: 10,
  },
  addButton: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkboxText: {
    marginLeft: 10,
    fontSize: 16,
  },
  removeButton: {
    marginLeft: 5,
  },
})

export default React.memo(FilterModal)