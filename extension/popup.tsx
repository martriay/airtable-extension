import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { getTags } from './utils/api';

const BACKEND_URL = 'https://airtable-extension-martriays-projects.vercel.app';

function Popup() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Start with loading true for auto-save
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState({ url: '', title: '', tags: '' });
  const tagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeAndAutoSave = async () => {
      // Get current tab info
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
          const currentUrl = tabs[0].url || '';
          const currentTitle = tabs[0].title || '';
          
          setUrl(currentUrl);
          setTitle(currentTitle);
          setOriginalData({ url: currentUrl, title: currentTitle, tags: '' });

          // Fetch available tags from Airtable
          try {
            const availTags = await getTags();
            setAvailableTags(availTags);
          } catch (error) {
            console.error('Failed to fetch tags:', error);
            setAvailableTags(['technology', 'programming', 'web', 'design', 'article']);
          }

          // Auto-save immediately
          await performSave(currentUrl, currentTitle, []);
        }
      });
    };

    initializeAndAutoSave();
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTitle(value);
    checkForChanges(url, value, tags);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUrl(value);
    checkForChanges(value, title, tags);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTags(value);
    checkForChanges(url, title, value);
    
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

  // Core save function that can be used for both auto-save and manual updates
  const performSave = async (saveUrl: string, saveTitle: string, saveTags: string[], forceUpdate = false) => {
    if (!saveUrl || !saveTitle) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: saveUrl,
          title: saveTitle,
          tags: saveTags,
          source: 'Extension',
          forceUpdate: forceUpdate,
          recordId: savedRecordId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.duplicate) {
        setSavedRecordId(result.existingId);
        
        // If we have existing data, populate the form
        if (result.existingData && !forceUpdate) {
          setTitle(result.existingData.title);
          setTags(result.existingData.tags.join(', '));
          setOriginalData({ 
            url: saveUrl, 
            title: result.existingData.title, 
            tags: result.existingData.tags.join(', ') 
          });
          setHasUnsavedChanges(false);
        } else {
          setHasUnsavedChanges(false);
          setOriginalData({ url: saveUrl, title: saveTitle, tags: saveTags.join(', ') });
        }
      } else {
        setSavedRecordId(result.id);
        setHasUnsavedChanges(false);
        setOriginalData({ url: saveUrl, title: saveTitle, tags: saveTags.join(', ') });
      }
    } catch (error) {
      console.error('Save error:', error);
      // Keep error state in isLoading to show error in button
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual save/update
  const handleSave = async () => {
    if (!url || !title) {
      return;
    }

    setIsLoading(true);

    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    // Use forceUpdate if we have unsaved changes and an existing record
    const shouldUpdate = hasUnsavedChanges && !!savedRecordId;
    await performSave(url, title, tagArray, shouldUpdate);
  };

  // Track changes to enable/disable update button
  const checkForChanges = (newUrl: string, newTitle: string, newTags: string) => {
    const hasChanges = newUrl !== originalData.url || 
                      newTitle !== originalData.title || 
                      newTags !== originalData.tags;
    setHasUnsavedChanges(hasChanges);
  };

  return (
    <div style={{ 
      width: '340px', 
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
          onChange={handleTitleChange}
          rows={1}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '36px',
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
          onChange={handleUrlChange}
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
        disabled={isLoading || (!hasUnsavedChanges && !!savedRecordId)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: isLoading ? '#9ca3af' : 
                          (!hasUnsavedChanges && savedRecordId) ? '#10b981' : 
                          hasUnsavedChanges ? '#f59e0b' : '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: (isLoading || (!hasUnsavedChanges && savedRecordId)) ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          opacity: (!hasUnsavedChanges && savedRecordId) ? 0.7 : 1
        }}
      >
        {isLoading ? 'Saving...' : 
         (!hasUnsavedChanges && savedRecordId) ? 'Saved' :
         hasUnsavedChanges ? 'Update Changes' : 'Save to Airtable'}
      </button>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 