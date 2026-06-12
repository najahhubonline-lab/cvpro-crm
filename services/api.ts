const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    return response;
  }

  async logout() {
    localStorage.removeItem('token');
  }

  // Conversations
  async getConversations() {
    return this.request('/conversations');
  }

  async getMessages(conversationId: string) {
    return this.request(`/messages/${conversationId}`);
  }

  async sendMessage(conversationId: string, text: string, sender: string) {
    return this.request(`/messages/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ text, sender }),
    });
  }

  // Customers
  async getCustomers() {
    return this.request('/customers');
  }

  async updateCustomer(id: string, data: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Tasks (Team Portal)
  async getTasks() {
    return this.request('/operations/tasks');
  }

  async updateTaskStatus(taskId: string, status: string) {
    return this.request(`/operations/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Settings
  async getAiConfig() {
    return this.request('/settings/ai-config');
  }

  async updateAiConfig(data: any) {
    return this.request('/settings/ai-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();
