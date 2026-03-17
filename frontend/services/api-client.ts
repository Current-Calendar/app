import { API_CONFIG } from "@/constants/api";
import { Platform } from 'react-native';
import { RegisterData, TokenResponse, User } from "@/types/auth";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";
import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * Appends a photo asset to a FormData in a way that works on both
 * React Native (uses the {uri,name,type} trick) and web (fetches a real Blob).
 */
export async function appendPhoto(
  formData: FormData,
  asset: ImagePickerAsset,
  fieldName = 'photo'
): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, asset.fileName ?? 'photo.jpg');
  } else {
    formData.append(fieldName, {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  user: User | null = null;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onAuthFailure: (() => void) | null = null;

  private storage = createAsyncStorage("auth");

  setOnAuthFailure(callback: () => void) {
    this.onAuthFailure = callback;
  }

  async loadTokens() {
    try {
      this.accessToken = await this.storage.getItem('accessToken');
      this.refreshToken = await this.storage.getItem('refreshToken');

      const user = await this.storage.getItem('user');
      if (user) {
        this.user = JSON.parse(user);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    await this.storage.setMany({
      "accessToken": this.accessToken,
      "refreshToken": this.refreshToken,
    });
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    await this.storage.clear();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async login(username: string, password: string) {
    const response = await this.post<TokenResponse>("/token/", { username, password });

    await this.setTokens(response.access, response.refresh);

    const user = await apiClient.get<User>('/users/me/');
    this.user = user;
    await this.storage.setItem('user', JSON.stringify(user));
  }

  async register(data: RegisterData): Promise<any> {
    return await this.post<any>("/auth/register/", data);
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_CONFIG.BaseURL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: this.refreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access;
      await this.storage.setItem('accessToken', data.access);

      if (data.refresh) {
        this.refreshToken = data.refresh;
        await this.storage.setItem('refreshToken', data.refresh);
      }

      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BaseURL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const hadAccessToken = Boolean(this.accessToken);
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, first attempt to refresh the token
    if (response.status === 401) {
      let retried = false;

      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken();

        if (refreshed && this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
          retried = true;
        }
      }

      if (!retried && hadAccessToken) {
        this.user = null;
        await this.clearTokens();
        delete headers['Authorization'];
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // Refresh failed — tokens are dead, force logout
        await this.clearTokens();
        this.onAuthFailure?.();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail =
        typeof errorData?.detail === 'string'
          ? errorData.detail
          : `HTTP ${response.status}`;
      throw new ApiError(detail, response.status, errorData);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? (isFormData ? data as BodyInit : JSON.stringify(data)) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? (isFormData ? data as BodyInit : JSON.stringify(data)) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient();

export default apiClient;