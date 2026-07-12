import axios from 'axios'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password']
const LOGIN_URLS = ['/auth/login']

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token && !config.url?.includes('/auth/login') && !config.url?.includes('/auth/refresh')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
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
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken }, { baseURL: import.meta.env.VITE_API_URL || '/api' })
          const newAccess = data.data?.accessToken
          if (newAccess) {
            localStorage.setItem('accessToken', newAccess)
            original.headers.Authorization = `Bearer ${newAccess}`
            return api(original)
          }
        } catch {
          // refresh failed
        }
      }
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      if (!isPublicPage) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
