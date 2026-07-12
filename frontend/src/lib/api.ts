import axios from 'axios'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password']
const LOGIN_URLS = ['/auth/login']

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const path = window.location.pathname
    const isPublicPage = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))
    const isLoginRequest = LOGIN_URLS.some((u) => original.url?.includes(u))

    if (error.response?.status === 401 && !original._retry && !isLoginRequest) {
      original._retry = true
      try {
        await api.post('/auth/refresh')
        return api(original)
      } catch {
        if (!isPublicPage) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
