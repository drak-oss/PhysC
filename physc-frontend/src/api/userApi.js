import client from './client';

export const userApi = {
  getProfile:     ()         => client.get('/users/profile').then(r => r.data),
  updateProfile:  (data)     => client.patch('/users/profile', data).then(r => r.data),
  changePassword: (data)     => client.post('/users/change-password', data).then(r => r.data),
  deleteAccount:  (data)     => client.delete('/users/account', { data }).then(r => r.data),
  searchUsers:    (q)        => client.get('/users/search', { params: { q } }).then(r => r.data),
  getUserProfile: (username) => client.get(`/users/${username}`).then(r => r.data),
};
