import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native'
import SignInWithNeynar from '../components/SignInWithNeynar'
import { Text, View } from '../components/Themed'
import FeedComponent from '../components/FeedComponent'
// import homepageHeader from '../assets/images/homepage-header.png';
import ConnectAsGuest from '../components/ConnectAsGuest'
import { FarcasterUser, useLogin } from 'farcasterkit-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import useAppContext from '../hooks/useAppContext'
import { LOCAL_STORAGE_KEYS } from '../constants/Farcaster'
import WebSignIn from '../components/WebSignIn'
import { NeynarAuthButton, useNeynarContext } from '@neynar/react'
import { eventEmitter } from '../utils/event'
import { Filter } from '../types/filter'

export default function IndexScreen() {
  const { farcasterUser } = useLogin()
  const { fid, setFid, setFilter, setUser } = useAppContext()
  const [login, setLogin] = useState(false)
  const { user } = useNeynarContext()

  const screenWidth = Dimensions.get('window').width

  const isMobileDevice = screenWidth <= 768

  console.log('isMobileDevice', isMobileDevice)

  console.log('user in index', user)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load filters first
        let filters
        if (Platform.OS === 'web') {
          filters = localStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS)
        } else {
          filters = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.FILTERS)
        }

        if (filters) {
          const parsedFilters = JSON.parse(filters)
          setFilter(parsedFilters)
        }

        // Then load user
        let user = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.FARCASTER_USER)
        if (user) {
          const parsedUser: FarcasterUser = JSON.parse(user)
          setFid(parsedUser?.fid || 4256)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadInitialData()
  }, [setFilter, setFid, setUser])

  // Handle filter changes
  useEffect(() => {
    const handleFilterChange = (newFilter: Filter) => {
      setFilter(newFilter)
    }

    eventEmitter.on('filtersUpdated', handleFilterChange)
    eventEmitter.on('filterChanged', handleFilterChange)

    return () => {
      eventEmitter.off('filtersUpdated', handleFilterChange)
      eventEmitter.off('filterChanged', handleFilterChange)
    }
  }, [setFilter])

  const buttonLabel = (
    label:
      | string
      | number
      | boolean
      | React.ReactElement<any, string | React.JSXElementConstructor<any>>
      | Iterable<React.ReactNode>
      | null
      | undefined,
  ) => {
    return (
      <View
        style={{
          padding: 12,
          backgroundColor: 'white',
        }}
      >
        <Text
          style={{
            color: 'black',
            fontWeight: '600',
            fontSize: 26,
          }}
        >
          {label}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <Image style={styles.homepageHeader} source={homepageHeader} resizeMode="contain" /> */}

      {user ? (
        <FeedComponent fid={user.fid} />
      ) : (
        <View style={styles.textContainer}>
          <Text style={styles.title}>Cozycast</Text>
          <Text style={styles.subtitle}>
            A beautiful yet simple Farcaster client
          </Text>
          <View>
            <View
              className="web-sign-in-container"
              style={{ backgroundColor: 'white' }}
            >
              <WebSignIn />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: 'white',
    // color: 'black',
  },
  textContainer: {
    marginTop: '20%',
    paddingLeft: '10%',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 40,
    fontWeight: '400',
    color: 'black',
  },
  subtitle: {
    fontSize: 18,
    color: 'black',
    marginBottom: 40,
  },
  homepageHeader: {
    width: '100%',
    height: undefined,
    aspectRatio: 2150 / 200,
  },
})
