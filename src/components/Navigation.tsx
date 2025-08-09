import React from 'react';
import { Link } from 'react-router-dom';

export function Navigation() {
  return (
        <nav className="bg-secondary p-4 mb-8">
      <div className="max-w-3xl mx-auto flex justify-center space-x-6">
        <Link to="/" className="text-text-primary hover:text-highlight">
          Play Game
        </Link>
        <Link to="/create" className="text-text-primary hover:text-highlight">
          Create Game
        </Link>
      </div>
    </nav>
  );
}
