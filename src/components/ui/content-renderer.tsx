"use client";

import React, { useMemo } from 'react';
import parse, { domToReact, HTMLReactParserOptions, Element } from 'html-react-parser';
import { MarkdownRenderer } from './markdown-renderer';

interface ContentRendererProps {
  content: string;
  className?: string;
  onUrlsExtracted?: (urls: string[]) => void;
}

/**
 * ContentRenderer - Intelligently renders content as either HTML or Markdown
 *
 * This component detects whether the content is HTML (from ReactQuill) or Markdown
 * and renders it appropriately using either html-react-parser or MarkdownRenderer.
 */
export function ContentRenderer({ content, className = "", onUrlsExtracted }: ContentRendererProps) {
  // Detect if content is HTML or Markdown
  const isHTML = useMemo(() => {
    if (!content) return false;

    // Check for common HTML tags that ReactQuill produces
    const htmlTagPattern = /<\/?(?:p|h[1-6]|ul|ol|li|strong|em|u|blockquote|br)\b[^>]*>/i;
    return htmlTagPattern.test(content);
  }, [content]);

  // Extract URLs from HTML content
  const extractedUrls = useMemo(() => {
    if (!isHTML) return [];

    const urls: string[] = [];
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;

    // Find all URLs in the content
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[1].replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }

    return urls;
  }, [content, isHTML]);

  // Notify parent component about extracted URLs
  React.useEffect(() => {
    if (onUrlsExtracted && extractedUrls.length > 0) {
      onUrlsExtracted(extractedUrls);
    }
  }, [extractedUrls, onUrlsExtracted]);

  // Parser options for HTML content
  const parserOptions: HTMLReactParserOptions = useMemo(() => ({
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.attribs) {
        const { name, attribs, children } = domNode;

        // Handle links - hide them since we'll show LinkPreview bubbles below
        if (name === 'a') {
          // Return null to hide the link from display - we'll show it as LinkPreview
          return null;
        }

        // Handle headings with distinct styling
        if (name === 'h1') {
          return (
            <h1 className="text-2xl font-bold mb-3 mt-4 text-foreground leading-tight">
              {domToReact(children as any, parserOptions)}
            </h1>
          );
        }

        if (name === 'h2') {
          return (
            <h2 className="text-xl font-bold mb-3 mt-3 text-foreground leading-tight">
              {domToReact(children as any, parserOptions)}
            </h2>
          );
        }

        if (name === 'h3') {
          return (
            <h3 className="text-lg font-semibold mb-2 mt-3 text-foreground leading-snug">
              {domToReact(children as any, parserOptions)}
            </h3>
          );
        }

        // Handle paragraphs with proper spacing
        if (name === 'p') {
          return (
            <p className="mb-2 text-foreground leading-relaxed text-[15px]">
              {domToReact(children as any, parserOptions)}
            </p>
          );
        }

        // Handle strong/bold
        if (name === 'strong') {
          return (
            <strong className="font-semibold text-foreground">
              {domToReact(children as any, parserOptions)}
            </strong>
          );
        }

        // Handle em/italic
        if (name === 'em') {
          return (
            <em className="italic text-foreground">
              {domToReact(children as any, parserOptions)}
            </em>
          );
        }

        // Handle underline
        if (name === 'u') {
          return (
            <u className="underline text-foreground">
              {domToReact(children as any, parserOptions)}
            </u>
          );
        }

        // Handle lists
        if (name === 'ul') {
          return (
            <ul className="list-disc list-inside mb-3 space-y-1 ml-4">
              {domToReact(children as any, parserOptions)}
            </ul>
          );
        }

        if (name === 'ol') {
          return (
            <ol className="list-decimal list-inside mb-3 space-y-1 ml-4">
              {domToReact(children as any, parserOptions)}
            </ol>
          );
        }

        if (name === 'li') {
          return (
            <li className="text-foreground leading-relaxed">
              {domToReact(children as any, parserOptions)}
            </li>
          );
        }

        // Handle blockquote
        if (name === 'blockquote') {
          return (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
              {domToReact(children as any, parserOptions)}
            </blockquote>
          );
        }
      }
    }
  }), []);

  // Render HTML content with proper styling
  if (isHTML) {
    return (
      <div
        className={`max-w-none ${className}`}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {parse(content, parserOptions)}
      </div>
    );
  }

  // Render Markdown content
  return <MarkdownRenderer content={content} className={className} />;
}
