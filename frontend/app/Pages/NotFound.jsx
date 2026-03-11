import React from 'react';
import { Link } from 'react-router';

const NotFound = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: 'var(--space-4)',
      gap: 'var(--space-4)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '6rem',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>404</h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-lg)',
      }}>Page not found</p>
      <Link to="/" style={{
        color: 'var(--accent)',
        textDecoration: 'none',
        fontWeight: 500,
        padding: 'var(--space-2) var(--space-4)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-md)',
        transition: 'background var(--transition-fast)',
      }}>Go home</Link>
    </div>
  );
};

export default NotFound;
