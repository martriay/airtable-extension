import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { getTags } from './utils/api';

const BACKEND_URL = 'https://airtable-extension-martriays-projects.vercel.app';

function Popup() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setUrl(tabs[0].url || '');
        setTitle(tabs[0].title || '');
      }
    });

    // Fetch available tags from Airtable
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        // Fallback to some basic tags if API fails
        setAvailableTags(['technology', 'programming', 'web', 'design', 'article']);
      }
    };

    fetchTags();
  }, []);

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTags(value);
    
    // Get the current word being typed
    const words = value.split(',');
    const currentWord = words[words.length - 1].trim().toLowerCase();
    
    if (currentWord.length > 0) {
      const suggestions = availableTags.filter(tag => 
        tag.toLowerCase().includes(currentWord) && 
        !words.slice(0, -1).map(w => w.trim().toLowerCase()).includes(tag.toLowerCase())
      );
      setFilteredSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setActiveSuggestion(-1);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(filteredSuggestions[activeSuggestion]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    const words = tags.split(',');
    words[words.length - 1] = suggestion;
    setTags(words.join(', ') + ', ');
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    tagsInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!url || !title) {
      setMessage('URL and title are required');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          title,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          source: 'Extension'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.duplicate) {
        setMessage('This URL was already saved!');
      } else {
        setMessage('Successfully saved to Airtable!');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Error saving to Airtable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      width: '420px', 
      padding: '16px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#ffffff',
      borderRadius: '8px'
    }}>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '6px', 
          fontSize: '13px', 
          fontWeight: '500',
          color: '#374151'
        }}>
          Title:
        </label>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '44px',
            lineHeight: '1.4',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '6px', 
          fontSize: '13px', 
          fontWeight: '500',
          color: '#374151'
        }}>
          URL:
        </label>
        <textarea
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '44px',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            wordBreak: 'break-all'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '6px', 
          fontSize: '13px', 
          fontWeight: '500',
          color: '#374151'
        }}>
          Tags (comma-separated):
        </label>
        <input
          ref={tagsInputRef}
          type="text"
          value={tags}
          onChange={handleTagsChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredSuggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking on them
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="e.g. technology, programming, web"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            boxSizing: 'border-box'
          }}
        />
        
        {showSuggestions && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                onClick={() => selectSuggestion(suggestion)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  backgroundColor: index === activeSuggestion ? '#f3f4f6' : 'white',
                  borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none'
                }}
                onMouseEnter={() => setActiveSuggestion(index)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s'
        }}
      >
        {isLoading ? 'Saving...' : 'Save to Airtable'}
      </button>

      {message && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0fdf4',
          color: message.includes('Error') ? '#dc2626' : '#16a34a',
          border: `1px solid ${message.includes('Error') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '6px',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 