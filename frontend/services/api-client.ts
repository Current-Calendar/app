import { API_CONFIG } from "@/constants/api";
import { RegisterData, TokenResponse, User } from "@/types/auth";
import { createAsyncStorage } from "@react-native-async-storage/async-storage";

class ApiClient {
  user: User | null = null;

  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private storage = createAsyncStorage("auth");

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

    const user = await apiClient.get<User>('/users/me');
    this.user = user;
    await this.storage.setItem('user', JSON.stringify(user));
  }

  async register(data: RegisterData): Promise<any> {
    return await this.post<any>("/auth/registro/", data);
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Si 401, intentar refrescar token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed && this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP ${response.status}`
      );
    }

    return response.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

}

const apiClient = new ApiClient();

export default apiClient;