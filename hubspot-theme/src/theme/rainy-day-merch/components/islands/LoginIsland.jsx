import { useState, useEffect, useCallback } from 'react';
import { requestMagicLink } from '../../utils/auth';

const API_BASE_URL = 'https://hsecommerce-api.vercel.app/api';

export default function LoginIsland() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyMagicLink = useCallback(async (token, email) => {
    try {
      setLoading(true);
      setError('');
      
      console.log('[LoginIsland] Verifying magic link...', { token: token.substring(0, 10) + '...', email });
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
      
      console.log('[LoginIsland] Response status:', response.status, response.ok);
      
      let data;
      try {
        data = await response.json();
        console.log('[LoginIsland] Response data:', data);
      } catch (parseError) {
        console.error('[LoginIsland] Failed to parse JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired magic link');
      }

      // Store session token
      if (data.token) {
        console.log('[LoginIsland] Storing session token...');
        localStorage.setItem('auth_session_token', data.token);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { authenticated: true } }));
        
        // Small delay to ensure token is stored before redirect
        setTimeout(() => {
          console.log('[LoginIsland] Redirecting to /account...');
          window.location.replace('/account');
        }, 100);
      } else {
        console.warn('[LoginIsland] No token in response:', data);
        throw new Error('No session token received');
      }
    } catch (err) {
      console.error('[LoginIsland] Error verifying magic link:', err);
      setError(err.message || 'Failed to verify magic link. Please try again.');
      setLoading(false);
    }
  }, []);

  // Check if we're verifying a magic link from email
  useEffect(() => {
    // First, try to get params from data attributes (set by HubL template server-side)
    const container = document.getElementById('login-container');
    let token = container?.dataset?.token || '';
    let emailParam = container?.dataset?.email || '';
    
    console.log('[LoginIsland] Data attributes - Token:', token ? token.substring(0, 10) + '...' : 'none');
    console.log('[LoginIsland] Data attributes - Email:', emailParam || 'none');
    
    // Fallback: Check URL params (in case HubSpot doesn't strip them)
    if (!token || !emailParam) {
      const fullUrl = window.location.href;
      const searchParams = window.location.search;
      
      console.log('[LoginIsland] Fallback - Full URL:', fullUrl);
      console.log('[LoginIsland] Fallback - Search params:', searchParams);
      
      const urlParams = new URLSearchParams(searchParams);
      token = token || urlParams.get('token') || '';
      emailParam = emailParam || urlParams.get('email') || '';
      
      console.log('[LoginIsland] Fallback - Token:', token ? token.substring(0, 10) + '...' : 'none');
      console.log('[LoginIsland] Fallback - Email:', emailParam || 'none');
    }

    if (token && emailParam) {
      console.log('[LoginIsland] Found magic link params, starting verification...');
      setIsVerifying(true);
      verifyMagicLink(token, emailParam);
    } else {
      console.log('[LoginIsland] No magic link params found');
    }
  }, [verifyMagicLink]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const result = await requestMagicLink(email.trim().toLowerCase());
      
      setLinkSent(true);
      setMessage('Check your email! We sent you a magic link to sign in.');
      
      // In development, show the link
      if (result.magicLink) {
        console.log('[Dev] Magic link:', result.magicLink);
        setMessage(`Check your email! (Dev: ${result.magicLink})`);
      }
    } catch (err) {
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {isVerifying && loading ? (
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying your magic link...
            </h2>
            <p className="text-sm text-gray-600">
              Please wait while we sign you in.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Sign in to your account
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                We'll send you a magic link to sign in instantly
              </p>
            </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{message}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={linkSent || loading}
              className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || linkSent}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending magic link...
                </span>
              ) : linkSent ? (
                'Magic link sent!'
              ) : (
                'Send magic link'
              )}
            </button>
          </div>

          {linkSent && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setLinkSent(false);
                  setEmail('');
                  setMessage('');
                }}
                className="text-sm text-primary hover:text-primary-600"
              >
                Send another link
              </button>
            </div>
          )}
        </form>

            <div className="text-center text-sm text-gray-600">
              <p>No password needed! Just click the link in your email.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

