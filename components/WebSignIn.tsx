import React, { useEffect, useState } from 'react'
import {
  Platform,
  StyleSheet,
} from 'react-native'
import { Text, View } from 'react-native'
import {
  NeynarSigninButton,
  ISuccessMessage,
} from '@neynar/react-native-signin'
import { router } from 'expo-router'
import { useLogin } from 'farcasterkit-react-native'
import useWarpcastUser from '../hooks/useWarpcastUser'
import axios from 'axios'
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCAL_STORAGE_KEYS } from '../constants/Farcaster'
import { NeynarAuthButton, useNeynarContext } from "@neynar/react";
import './styles.css'

export default function WebSignIn() {
  const { farcasterUser, setFarcasterUser } = useLogin()
  const [fid, setFid] = useState<number | null>(null)
  const { user: warpcastUser, loading, error } = useWarpcastUser(fid)
  const neynarApiKey = process.env.EXPO_PUBLIC_NEYNAR_API_KEY
  const neynarClientId = process.env.EXPO_PUBLIC_NEYNAR_CLIENT_ID
  const { user } = useNeynarContext();
  const [signerUuid, setSignerUuid] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      const farcasterUser = {
        signer_uuid: user.signer_uuid,
        fid: Number(user.fid),
        fname: user?.username,
        displayName: user?.display_name,
        profile: {
          bio: user.profile.bio.text,
        },
        pfp: user.pfp_url,
        followerCount: user?.follower_count,
        followingCount: user?.following_count,
      }
      AsyncStorage.setItem(
        LOCAL_STORAGE_KEYS.FARCASTER_USER,
        JSON.stringify(farcasterUser),
      )
      if (Platform.OS === 'web') {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FARCASTER_USER, JSON.stringify(farcasterUser))
      }
    //   setFarcasterUser(farcasterUser)
      router.push('/(tabs)')
      setFid(Number(user.fid))
      setSignerUuid(user.signer_uuid)
  
    }
  }, [user])



  console.log('user', user)


  const handleError = (err: Error) => {
    console.log(err)
  }
  return (
    <View style={styles.container}>
              <NeynarAuthButton style={{backgroundColor:'white', background:'white'}} />


    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
    marginTop: 0,
    height: 'auto',
    minHeight: '10%',
    right: '5%',
  },
  neynarSignInBtn: {
    marginRight: '20%',
  },
})
