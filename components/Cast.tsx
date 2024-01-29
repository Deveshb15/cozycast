import _ from 'lodash'
import { formatDistanceToNow } from 'date-fns'
import React from 'react'
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useLogin, useReaction } from 'farcasterkit-react-native'
import { Link } from 'expo-router'

const Cast = ({ cast }: { cast: NeynarCastV2 }) => {
  const { farcasterUser } = useLogin()
  const postReaction = useReaction()

  const handleReaction = async (type: 'like' | 'recast', hash: string) => {
    try {
      if (!farcasterUser) throw new Error('Not logged in')
      await postReaction(type, hash)
      console.log(`${type}d cast with hash ${hash}`)
    } catch (error) {
      console.error('Error posting reaction:', error)
    }
  }

  const renderImages = () => {
    // Regex to match image URLs
    const regex = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif)/g

    // Find matches in cast.text
    const textMatches = cast.text.match(regex) || []

    // Extract URLs from cast.embeds
    const embedMatches = cast.embeds
      .filter((embed) => embed.url && embed.url.match(regex))
      .map((embed) => embed.url)

    // Combine and de-duplicate URLs from text and embeds
    const allMatches = Array.from(new Set([...textMatches, ...embedMatches]))

    // Render images
    return allMatches.map((url) => (
      <Image key={url} source={{ uri: url }} style={styles.image} />
    ))
  }

  const relativeTime = formatDistanceToNow(new Date(cast.timestamp), {
    addSuffix: true,
  })
  return (
    <Link href={`/conversation?hash=${cast.hash}`}>
      <View style={styles.castContainer}>
        <Image
          source={{ uri: cast.author.pfp_url ?? '' }}
          style={styles.pfpImage}
        />
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.displayName}>
              {cast.author.display_name} ·{' '}
              <Text style={styles.timestamp}>
                {_.replace(relativeTime, 'about ', '')}
              </Text>
            </Text>
            {/* <Text style={styles.timestamp}>{_.replace(relativeTime, 'about ', '')}</Text> */}
          </View>
          <Text style={styles.castText}>{cast.text}</Text>
          {renderImages()}
          <View style={styles.reactionsContainer}>
            <View style={styles.reactionsGroupContainer}>
              <FontAwesome name="comment-o" size={11} color="black" />
              <Text style={styles.reactionText}> {cast.replies.count}</Text>
            </View>
            <TouchableOpacity
              disabled={!farcasterUser}
              onPress={() => handleReaction('recast', cast.hash)}
            >
              <View style={styles.reactionsGroupContainer}>
                <FontAwesome
                  name="retweet"
                  size={11}
                  color="black"
                  style={{ opacity: farcasterUser ? 100 : 50 }}
                />
                <Text style={styles.reactionText}>
                  {' '}
                  {cast.reactions.recasts.length}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!farcasterUser}
              onPress={() => handleReaction('like', cast.hash)}
            >
              <View style={styles.reactionsGroupContainer}>
                <FontAwesome
                  name="heart-o"
                  size={11}
                  color="black"
                  style={{ opacity: farcasterUser ? 100 : 50 }}
                />
                <Text style={styles.reactionTextFirst}>
                  {' '}
                  {cast.reactions.likes.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Link>
  )
}

const styles = StyleSheet.create({
  castContainer: {
    borderBottomWidth: 1,
    borderColor: '#eaeaea',
    flexDirection: 'row',
    padding: 10,
    zIndex: -50,
    width: '100%',
  },
  castText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 18,
    paddingRight: 8,
    paddingBottom: 3,
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  flashList: {
    backgroundColor: '#fff',
  },
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  icon: {
    resizeMode: 'contain',
  },
  pfpImage: {
    borderRadius: 25,
    height: 30,
    marginLeft: 10,
    marginRight: 15,
    width: 30,
  },
  reactionText: {
    color: '#000',
    fontSize: 11,
  },
  reactionTextFirst: {
    color: '#000',
    fontSize: 11,
  },
  reactionsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    marginTop: 4,
    paddingBottom: 1,
  },
  reactionsGroupContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 4,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
    fontWeight: '300',
    paddingBottom: 4,
    paddingRight: 6,
  },
  imageContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  image: {
    width: 100, // Set your desired image width
    height: 100, // Set your desired image height
    marginRight: 4,
    paddingBottom: 4,
  },
})

export default Cast
