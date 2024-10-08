import { FontAwesome } from '@expo/vector-icons'
import { useRoute, useNavigation } from '@react-navigation/native'
import React, { useState, useCallback } from 'react'
import {
  Alert,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import useAppContext from '../hooks/useAppContext'
import FilterList from './FilterComponent'
import { Notifications } from './Notification'

const HomeHeaderRight = () => {
  const navigation = useNavigation()
  const { fid } = useAppContext()
  const [isFilterVisible, setFilterVisible] = useState(false)
  const [isSelected, setIsSelected] = useState('filter')
  const router = useRouter()

  const handleSelect = useCallback((name) => {
    setIsSelected(name)
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => {
            handleSelect('filter')
            router.push(`/(tabs)/channel?type=channel&fid=${fid}`)
          }}
        >
          <Text style={{
            ...styles.linkText,
            color: isSelected === 'filter' ? 'black' : 'grey',
          }}>Following</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            handleSelect('global')
            router.push(`/(tabs)/channel?type=all`)
          }}
        >
          <Text style={{
            ...styles.linkText,
            color: isSelected === 'global' ? 'black' : 'grey',
          }}>Global Feed</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.filterBtn}
        onPress={() => setFilterVisible((prev) => !prev)}
      >
        <Text>Add Filters</Text>
        <FontAwesome
          name="filter"
          size={18}
          color="#565555"
          style={styles.filterIcon}
        />
      </Pressable>

      <FilterList
        visible={isFilterVisible}
        onClose={() => setFilterVisible((prev) => !prev)}
      />
      <Notifications />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: '2.5%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  filterIcon: {
    padding: 5,
  },
  filterBtn: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
  },
})

export default HomeHeaderRight
