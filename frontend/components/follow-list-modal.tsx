import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FollowUser } from '@/hooks/use-user-follows';

type FollowListModalProps = {
  visible: boolean;
  title: string;
  users: FollowUser[];
  loading?: boolean;
  onClose: () => void;
};

const FollowListModal: React.FC<FollowListModalProps> = ({
  visible,
  title,
  users,
  loading = false,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color="#164E52" />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.userRow}>
                <Image
                  source={
                    item.photo
                      ? { uri: item.photo }
                      : require('../assets/images/default-user.jpg')
                  }
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{item.username}</Text>
                  {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
                  <Text style={styles.meta}>
                    {item.total_followers ?? 0} seguidores · {item.total_following ?? 0} seguidos
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Todavía no hay usuarios en esta lista.</Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: '#fffef8',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#262626' },
  closeText: { color: '#164E52', fontWeight: '600' },
  loadingWrapper: { paddingVertical: 20, alignItems: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#ececec' },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600', color: '#262626' },
  bio: { fontSize: 12, color: '#737373', marginTop: 2 },
  meta: { fontSize: 11, color: '#9a9a9a', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },
  emptyText: { textAlign: 'center', color: '#737373', paddingVertical: 16 },
  listContent: { paddingBottom: 20 },
});

export default FollowListModal;
