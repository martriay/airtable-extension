import { describe, it, expect } from 'vitest';
import { cleanTitle } from '../../api/src/title';

describe('cleanTitle', () => {
  it('returns empty string for empty input', () => {
    expect(cleanTitle('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(cleanTitle('  Hello World  ')).toBe('Hello World');
  });

  it('strips YouTube suffix with hyphen', () => {
    expect(cleanTitle('My Video - YouTube')).toBe('My Video');
  });

  it('strips YouTube suffix with em dash', () => {
    expect(cleanTitle('My Video — YouTube')).toBe('My Video');
  });

  it('strips YouTube suffix with pipe', () => {
    expect(cleanTitle('My Video | YouTube')).toBe('My Video');
  });

  it('strips youtube.com domain suffix', () => {
    expect(cleanTitle('My Video - youtube.com')).toBe('My Video');
  });

  it('strips Twitter suffix', () => {
    expect(cleanTitle('Tweet text - Twitter')).toBe('Tweet text');
  });

  it('strips X suffix', () => {
    expect(cleanTitle('Tweet text / X')).toBe('Tweet text / X'); // not stripped: only [-–—|] separators
    expect(cleanTitle('Tweet text - X')).toBe('Tweet text');
  });

  it('strips "on Twitter" suffix', () => {
    expect(cleanTitle('Some user on Twitter')).toBe('Some user');
  });

  it('strips "on X" suffix', () => {
    expect(cleanTitle('Some user on X')).toBe('Some user');
  });

  it('strips Reddit suffix', () => {
    expect(cleanTitle('Cool post - Reddit')).toBe('Cool post');
  });

  it('strips r/subreddit suffix', () => {
    expect(cleanTitle('Cool post - r/programming')).toBe('Cool post');
  });

  it('strips LinkedIn suffix', () => {
    expect(cleanTitle('My career update | LinkedIn')).toBe('My career update');
  });

  it('strips Facebook, Instagram, TikTok suffixes', () => {
    expect(cleanTitle('Post - Facebook')).toBe('Post');
    expect(cleanTitle('Post - Instagram')).toBe('Post');
    expect(cleanTitle('Post - TikTok')).toBe('Post');
    expect(cleanTitle('Cool video on TikTok')).toBe('Cool video');
  });

  it('strips Medium, Vimeo, Twitch, GitHub, Stack Overflow, Wikipedia', () => {
    expect(cleanTitle('Article - Medium')).toBe('Article');
    expect(cleanTitle('Video - Vimeo')).toBe('Video');
    expect(cleanTitle('Stream - Twitch')).toBe('Stream');
    expect(cleanTitle('repo - GitHub')).toBe('repo');
    expect(cleanTitle('How to X - Stack Overflow')).toBe('How to X');
    expect(cleanTitle('Topic - Wikipedia')).toBe('Topic');
  });

  it('strips news suffixes', () => {
    expect(cleanTitle('Headline - BBC')).toBe('Headline');
    expect(cleanTitle('Headline - CNN')).toBe('Headline');
    expect(cleanTitle('Headline - The Guardian')).toBe('Headline');
    expect(cleanTitle('Headline | The Times')).toBe('Headline');
  });

  it('strips generic domain.com suffix', () => {
    expect(cleanTitle('Article - example.com')).toBe('Article');
  });

  it('is idempotent on already-clean titles', () => {
    expect(cleanTitle('Just a regular title')).toBe('Just a regular title');
    expect(cleanTitle(cleanTitle('My Video - YouTube'))).toBe('My Video');
  });

  it('returns original when cleaning would produce an empty string', () => {
    expect(cleanTitle('YouTube')).toBe('YouTube');
    expect(cleanTitle('- YouTube')).toBe('- YouTube');
  });

  it('removes trailing separator left over after suffix strip', () => {
    expect(cleanTitle('Title -')).toBe('Title');
    expect(cleanTitle('Title |')).toBe('Title');
  });

  it('handles case-insensitive suffix matching', () => {
    expect(cleanTitle('My Video - youtube')).toBe('My Video');
    expect(cleanTitle('Tweet - TWITTER')).toBe('Tweet');
  });
});
