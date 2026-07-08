import client from './client';

export const authApi = {
  signup: (data) => client.post('/auth/signup', data).then(r => r.data),
  login:  (data) => client.post('/auth/login',  data).then(r => r.data),
  me:     ()     => client.get('/auth/me').then(r => r.data),
};
