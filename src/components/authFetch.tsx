import Cookies from 'js-cookie';

export const authFetch = (url: string, options: RequestInit = {}) => {
    const token = Cookies.get('access_token');
    if (!token) {
      console.warn('No access token found in cookies');
    }
  
    const headers = {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  
    return fetch(url, {
      ...options,
      headers,
    });
};
