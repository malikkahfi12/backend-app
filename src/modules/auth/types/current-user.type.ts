export interface CurrentUserPayload {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarInitials: string;
  isActive: boolean;
  deviceId: string;
  createdAt: string;
}
