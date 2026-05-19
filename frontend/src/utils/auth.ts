export const getToken = (): string | null => 
  sessionStorage.getItem('token') || localStorage.getItem('token')

export const isAuthenticated = (): boolean => !!getToken()

export const getAuthHeaders = () => {
  const token = getToken()
  if (!token) throw new Error('No hay token de autenticación')
  return { Authorization: `Bearer ${token}` }
}

export const logout = () => {
  sessionStorage.removeItem('token')
  localStorage.removeItem('token')
}
