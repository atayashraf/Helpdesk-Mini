import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import api, { parseError, setAuthToken } from '../api/client';
import { useAuth } from '../state/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      login(user, token);
      setAuthToken(token);
      const redirect = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname || '/tickets';
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="card">
        <h2>Log in</h2>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p className="hint">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
