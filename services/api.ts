const API_URL = '/api/v1';

class ApiService {
  private accessToken: string | null = null;

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response, originalRequest?: () => Promise<Response>): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && originalRequest) {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          
          if (refreshRes.ok) {
            const { access_token } = await refreshRes.json();
            this.accessToken = access_token;
            
            const retryResponse = await originalRequest();
            if (retryResponse.ok) return retryResponse.json();
          }
        } catch (e) {
          console.error('Token refresh failed', e);
        }
        
        this.accessToken = null;
        throw new Error('Session expired');
      }
      
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    const executeFetch = () => fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
      credentials: 'include',
    });

    const response = await executeFetch();
    return this.handleResponse(response, executeFetch);
  }

  async login(credentials: any): Promise<{ access_token: string; user: any }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    const data = await this.handleResponse<{ access_token: string; user: any }>(response);
    this.accessToken = data.access_token;
    return data;
  }

  async refresh(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Session expired');
    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async logout(): Promise<void> {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    this.accessToken = null;
  }

  async getDashboardStats(): Promise<any> { return this.fetchWithAuth('/dashboard/stats'); }
  async getCustomers(skip = 0, take = 50): Promise<{ data: any[], total: number }> { return this.fetchWithAuth(`/customers?skip=${skip}&take=${take}`); }
  async getConversations(): Promise<any[]> { return this.fetchWithAuth('/conversations'); }
  async getMessages(conversationId: string): Promise<any[]> { return this.fetchWithAuth(`/messages/conversation/${conversationId}`); }
  async sendMessage(conversationId: string, text: string): Promise<any> {
    return this.fetchWithAuth(`/messages/conversation/${conversationId}`, { method: 'POST', body: JSON.stringify({ text }) });
  }
  async toggleBot(conversationId: string, botActive: boolean): Promise<any> {
    return this.fetchWithAuth(`/conversations/${conversationId}/bot`, { method: 'PATCH', body: JSON.stringify({ botActive }) });
  }
  async getTemplates(): Promise<any[]> { return this.fetchWithAuth('/templates'); }
  async getBroadcasts(): Promise<any[]> { return this.fetchWithAuth('/broadcasts'); }
  async createBroadcast(data: any): Promise<any> {
    return this.fetchWithAuth('/broadcasts', { method: 'POST', body: JSON.stringify(data) });
  }
  async getAiConfig(): Promise<any> { return this.fetchWithAuth('/settings/ai-config'); }
  async updateAiConfig(data: any): Promise<any> {
    return this.fetchWithAuth('/settings/ai-config', { method: 'PATCH', body: JSON.stringify(data) });
  }
  async getTasks(): Promise<any[]> { return this.fetchWithAuth('/operations/tasks'); }
  async updateTaskStatus(taskId: string, status: string, outputUrl?: string): Promise<any> {
    return this.fetchWithAuth(`/operations/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, outputUrl }),
    });
  }
}

export const api = new ApiService();
