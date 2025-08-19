import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getTags,
  deleteEntry,
  checkUrl,
  markAsDone,
  markAsNext,
  markAsTodo,
} from './utils/api';

// Format date in a more colloquial way
function formatColloquialDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Parse the date string as local date to avoid timezone issues
    const [dateYear, dateMonth, dateDay] = dateString.split('-').map(Number);
    const date = new Date(dateYear, dateMonth - 1, dateDay); // month is 0-indexed
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Check if it's today
    if (itemDate.getTime() === today.getTime()) {
      return 'Done today';
    }
    
    // Check if it's yesterday
    if (itemDate.getTime() === yesterday.getTime()) {
      return 'Done yesterday';
    }
    
    // Format as "Done on Month Dth, YYYY"
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Add ordinal suffix
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `Done on ${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
  } catch (error) {
    // Fallback to original format if parsing fails
    return `Done ${dateString}`;
  }
}

// Clean title by removing common site suffixes
function cleanTitle(title: string): string {
  if (!title) return title;

  // Common patterns to remove (case insensitive)
  const suffixPatterns = [
    // YouTube variations
    /\s*[-–—|]\s*YouTube$/i,
    /\s*[-–—|]\s*youtube\.com$/i,

    // Twitter/X variations
    /\s*[-–—|]\s*Twitter$/i,
    /\s*[-–—|]\s*X$/i,
    /\s*on\s+Twitter$/i,
    /\s*on\s+X$/i,

    // Reddit variations
    /\s*[-–—|]\s*Reddit$/i,
    /\s*[-–—|]\s*r\/\w+$/i,

    // LinkedIn variations
    /\s*[-–—|]\s*LinkedIn$/i,

    // Facebook variations
    /\s*[-–—|]\s*Facebook$/i,

    // Instagram variations
    /\s*[-–—|]\s*Instagram$/i,

    // TikTok variations
    /\s*[-–—|]\s*TikTok$/i,
    /\s*on\s+TikTok$/i,

    // Medium variations
    /\s*[-–—|]\s*Medium$/i,

    // Vimeo variations
    /\s*[-–—|]\s*Vimeo$/i,

    // Twitch variations
    /\s*[-–—|]\s*Twitch$/i,

    // GitHub variations
    /\s*[-–—|]\s*GitHub$/i,

    // Stack Overflow variations
    /\s*[-–—|]\s*Stack\s*Overflow$/i,

    // Wikipedia variations
    /\s*[-–—|]\s*Wikipedia$/i,

    // General news sites (common patterns)
    /\s*[-–—|]\s*BBC$/i,
    /\s*[-–—|]\s*CNN$/i,
    /\s*[-–—|]\s*The\s+\w+$/i, // "The Guardian", "The Times", etc.

    // Generic patterns (be more conservative with these)
    /\s*[-–—|]\s*\w+\.com$/i, // domain.com
  ];

  let cleanedTitle = title.trim();

  // Apply each pattern
  for (const pattern of suffixPatterns) {
    cleanedTitle = cleanedTitle.replace(pattern, '').trim();
  }

  // Remove any trailing separators that might be left
  cleanedTitle = cleanedTitle.replace(/\s*[-–—|]\s*$/, '').trim();

  // If we cleaned everything away, return the original
  if (!cleanedTitle) {
    return title;
  }

  return cleanedTitle;
}

const BACKEND_URL = 'https://airtable-extension-martriays-projects.vercel.app';

function Popup() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Start optimistic
  const [isInitializing, setIsInitializing] = useState(true); // Track URL checking
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState({ url: '', title: '', tags: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [isMarkingNext, setIsMarkingNext] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | undefined>(undefined);
  const [doneDate, setDoneDate] = useState<string | undefined>(undefined);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeSmartly = async () => {
      // Get current tab info
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
          const currentUrl = tabs[0].url || '';
          const rawTitle = tabs[0].title || '';
          const currentTitle = cleanTitle(rawTitle);

          setUrl(currentUrl);
          setTitle(currentTitle);

          try {
            // Fetch available tags in parallel with URL check
            console.log('🔄 Starting parallel fetch: tags + URL check for:', currentUrl);
            const [availTags, urlCheck] = await Promise.all([
              getTags(),
              checkUrl(currentUrl),
            ]);

            console.log('📊 URL Check result:', JSON.stringify(urlCheck, null, 2));
            setAvailableTags(availTags);

            if (urlCheck.exists && urlCheck.existingData) {
              // URL already exists - populate form with existing data
              console.log('🎯 URL already exists, populating form with existing data - NO SAVE NEEDED');
              const existingTitle = urlCheck.existingData.title;
              const existingTags = urlCheck.existingData.tags.join(', ');

              setTitle(existingTitle);
              setTags(existingTags);
              setSavedRecordId(urlCheck.recordId || null);
              setCurrentStatus(urlCheck.existingData.status);
              setDoneDate(urlCheck.existingData.doneDate);
              setOriginalData({
                url: currentUrl,
                title: existingTitle,
                tags: existingTags,
              });
              setHasUnsavedChanges(false);
              setIsLoading(false); // Stop loading - no save needed
              setIsInitializing(false); // Done initializing
              console.log('✅ Form populated instantly, button should show "Saved"');
              console.log('📊 Status:', urlCheck.existingData.status);
            } else {
              // New URL - auto-save with cleaned title
              console.log('🆕 New URL detected, auto-saving');
              setIsLoading(true); // Only show loading for new URLs that need saving
              setOriginalData({ url: currentUrl, title: currentTitle, tags: '' });
              await performSave(currentUrl, currentTitle, []);
              setIsInitializing(false); // Done initializing
            }
          } catch (error) {
            console.error('Failed to initialize:', error);
            // Fallback to basic initialization
            setAvailableTags(['technology', 'programming', 'web', 'design', 'article']);
            setOriginalData({ url: currentUrl, title: currentTitle, tags: '' });
            setIsLoading(false);
            setIsInitializing(false); // Done initializing
          }
        }
      });
    };

    initializeSmartly();
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setTitle(value);
    checkForChanges(url, value, tags);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && hasUnsavedChanges && savedRecordId) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setUrl(value);
    checkForChanges(value, title, tags);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && hasUnsavedChanges && savedRecordId) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTags(value);
    checkForChanges(url, title, value);

    // Get the current word being typed
    const words = value.split(',');
    const currentWord = words[words.length - 1].trim().toLowerCase();

    if (currentWord.length > 0) {
      const suggestions = availableTags.filter((tag) => tag.toLowerCase().includes(currentWord)
        && !words.slice(0, -1).map((w) => w.trim().toLowerCase()).includes(tag.toLowerCase()));
      setFilteredSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setActiveSuggestion(-1);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
        return;
      } if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      } if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[activeSuggestion]);
        return;
      } if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        return;
      }
    }

    // Handle Enter for saving when there are unsaved changes
    if (e.key === 'Enter' && hasUnsavedChanges && savedRecordId) {
      e.preventDefault();
      handleSave();
    }
  };

  const selectSuggestion = (suggestion: string) => {
    const words = tags.split(',');
    words[words.length - 1] = suggestion;
    setTags(`${words.join(', ')}, `);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    tagsInputRef.current?.focus();
  };

  // Core save function that can be used for both auto-save and manual updates
  const performSave = async (
    saveUrl: string,
    saveTitle: string,
    saveTags: string[],
    forceUpdate = false,
  ) => {
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
          forceUpdate,
          recordId: savedRecordId,
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
            tags: result.existingData.tags.join(', '),
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

    const tagArray = tags.split(',').map((tag) => tag.trim()).filter((tag) => tag);
    // Use forceUpdate if we have unsaved changes and an existing record
    const shouldUpdate = hasUnsavedChanges && !!savedRecordId;
    await performSave(url, title, tagArray, shouldUpdate);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!savedRecordId) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteEntry(savedRecordId);
      // Reset the form state after successful deletion
      setSavedRecordId(null);
      setHasUnsavedChanges(false);
      setOriginalData({ url: '', title: '', tags: '' });
    } catch (error) {
      console.error('Delete failed:', error);
      // Keep the current state if delete fails
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle mark as done (or undo if already done)
  const handleMarkAsDone = async () => {
    if (!savedRecordId) {
      return;
    }

    setIsMarkingDone(true);

    try {
      if (currentStatus === 'Done') {
        // Undo: Mark as "To do" and clear done date
        const result = await markAsTodo(savedRecordId);
        console.log('↩️ Successfully reverted from done to to-do');
        setCurrentStatus(result.status || 'To do');
        setDoneDate(undefined);
      } else {
        // Mark as done
        const result = await markAsDone(savedRecordId);
        console.log('✅ Successfully marked item as done');
        setCurrentStatus('Done');
        setDoneDate(result.doneDate || new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Mark as done/undo failed:', error);
      // Keep the current state if operation fails
    } finally {
      setIsMarkingDone(false);
    }
  };

  // Handle mark as next (or undo if already next)
  const handleMarkAsNext = async () => {
    if (!savedRecordId) {
      return;
    }

    setIsMarkingNext(true);

    try {
      if (currentStatus === 'Next') {
        // Undo: Mark as "To do" and clear done date
        const result = await markAsTodo(savedRecordId);
        console.log('↩️ Successfully reverted from next to to-do');
        setCurrentStatus(result.status || 'To do');
        setDoneDate(undefined);
      } else {
        // Mark as next
        const result = await markAsNext(savedRecordId);
        console.log('✅ Successfully marked item as next');
        setCurrentStatus(result.status || 'Next');
        setDoneDate(undefined); // Clear the done date
      }
    } catch (error) {
      console.error('Mark as next/undo failed:', error);
      // Keep the current state if operation fails
    } finally {
      setIsMarkingNext(false);
    }
  };

  // Track changes to enable/disable update button
  const checkForChanges = (newUrl: string, newTitle: string, newTags: string) => {
    const hasChanges = newUrl !== originalData.url
                      || newTitle !== originalData.title
                      || newTags !== originalData.tags;
    setHasUnsavedChanges(hasChanges);
  };

  return (
    <div style={{
      minWidth: '320px',
      maxWidth: '500px',
      width: 'max-content',
      minHeight: '300px',
      padding: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
    }}>

      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          marginBottom: '4px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
        }}>
          Title:
        </label>
                            <textarea
            value={title}
                      onChange={handleTitleChange}
                      onKeyDown={handleTitleKeyDown}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        minHeight: '52px',
                        lineHeight: '1.4',
                        boxSizing: 'border-box',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          marginBottom: '4px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
        }}>
          URL:
        </label>
                            <textarea
            value={url}
                      onChange={handleUrlChange}
                      onKeyDown={handleUrlKeyDown}
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
                        wordBreak: 'break-all',
                      }}
                    />
      </div>

      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <label style={{
          display: 'block',
          marginBottom: '4px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
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
            boxSizing: 'border-box',
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
            overflowY: 'auto',
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
                  borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                }}
                onMouseEnter={() => setActiveSuggestion(index)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>



      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={(!savedRecordId || hasUnsavedChanges) ? handleSave : undefined}
          disabled={isInitializing || isLoading || (!!savedRecordId && !hasUnsavedChanges)}
                                style={{
                                  flex: '1',
                                  padding: '12px 16px',
                                  backgroundColor:
                          isInitializing ? '#f9fafb'
                            : isLoading ? '#9ca3af'
                              : (!hasUnsavedChanges && savedRecordId) ? '#f3f4f6'
                                : hasUnsavedChanges ? '#7c3aed' : '#2563eb',
                                  color: isInitializing ? '#9ca3af' 
                                        : isLoading ? 'white'
                                        : (!hasUnsavedChanges && savedRecordId) ? '#6b7280'
                                        : 'white',
                                  border: isInitializing ? '2px solid #e5e7eb' 
                                         : (!hasUnsavedChanges && savedRecordId) ? '1px solid #d1d5db'
                                         : 'none',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: (isInitializing || isLoading || (!!savedRecordId && !hasUnsavedChanges)) ? 'default' : 'pointer',
                                  transition: 'all 0.3s ease',
                                  opacity: isInitializing ? 0.6 : 1,
                                  minHeight: '44px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                    >
                      {isInitializing ? '⚡'
                        : isLoading ? 'Saving...'
                          : (!hasUnsavedChanges && savedRecordId) ? 
                            (currentStatus === 'Done' && doneDate ? 
                              formatColloquialDate(doneDate) :
                              currentStatus === 'Next' ? 'Next' :
                              currentStatus === 'To do' ? 'To do' :
                              currentStatus ? `Status: ${currentStatus}` : 'Saved')
                            : hasUnsavedChanges ? 'Update' : 'Save'}
        </button>

        {savedRecordId && (
          <button
            onClick={handleMarkAsDone}
            disabled={isMarkingDone || isLoading}
            title={currentStatus === 'Done' ? 'Undo Done (mark as To do)' : 'Mark as Done'}
            style={{
              width: '36px',
              height: '44px',
              padding: '0',
              backgroundColor: isMarkingDone ? '#f3f4f6' 
                              : currentStatus === 'Done' ? '#d1fae5'
                              : '#ffffff',
              color: isMarkingDone ? '#9ca3af'
                    : currentStatus === 'Done' ? '#065f46'
                    : '#059669',
              border: `1px solid ${isMarkingDone ? '#d1d5db' 
                                  : currentStatus === 'Done' ? '#a7f3d0'
                                  : '#059669'}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: (isMarkingDone || isLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMarkingDone ? '...' : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            )}
          </button>
        )}

        {savedRecordId && (
          <button
            onClick={handleMarkAsNext}
            disabled={isMarkingNext || isLoading}
            title={currentStatus === 'Next' ? 'Undo Next (mark as To do)' : 'Mark as Next'}
            style={{
              width: '36px',
              height: '44px',
              padding: '0',
              backgroundColor: isMarkingNext ? '#f3f4f6' 
                              : currentStatus === 'Next' ? '#dbeafe'
                              : '#ffffff',
              color: isMarkingNext ? '#9ca3af'
                    : currentStatus === 'Next' ? '#1d4ed8'
                    : '#2563eb',
              border: `1px solid ${isMarkingNext ? '#d1d5db' 
                                  : currentStatus === 'Next' ? '#93c5fd'
                                  : '#2563eb'}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: (isMarkingNext || isLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMarkingNext ? '...' : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            )}
          </button>
        )}

        {savedRecordId && (
          <button
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            title="Delete from Airtable"
            style={{
              width: '36px',
              height: '44px',
              padding: '0',
              backgroundColor: isDeleting ? '#f3f4f6' : '#ffffff',
              color: isDeleting ? '#9ca3af' : '#dc2626',
              border: `1px solid ${isDeleting ? '#d1d5db' : '#dc2626'}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: (isDeleting || isLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDeleting ? '...' : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
