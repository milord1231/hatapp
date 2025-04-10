import Cookies from 'js-cookie';

// utils/authFetch.ts
export const authFetch = (url: string, options: RequestInit = {}) => {
    const token = Cookies.get('access_token');
  
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  
    return fetch(url, {
      ...options,
      headers,
    });
  };
  