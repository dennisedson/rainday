import { useState } from 'react';

/**
 * NewsletterIsland - Client-side component for newsletter signup form
 * This runs in the browser as an island
 */
export default function NewsletterIsland({ title, subtitle, placeholderText, buttonText }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      // TODO: Replace with actual newsletter subscription endpoint
      // For now, just simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('success');
      setMessage('Thank you for subscribing! Check your email for confirmation.');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        {title && (
          <h2 className="text-3xl font-bold mb-4">
            {title}
          </h2>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}

        {/* Newsletter Form */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholderText || 'Enter your email'}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Subscribing...' : (buttonText || 'Subscribe')}
            </button>
          </div>

          {/* Status Messages */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                status === 'success'
                  ? 'bg-green-900/50 text-green-200 border border-green-800'
                  : 'bg-red-900/50 text-red-200 border border-red-800'
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}





