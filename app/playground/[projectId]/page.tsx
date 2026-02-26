'use client'
import React, { useEffect, useState } from 'react'
import PlaygroundHeader from '../_components/PlaygroundHeader';
import ChatSection from '../_components/ChatSection';
import WebSiteDesign from '../_components/WebSiteDesign';
import ElementSettingSection from '../_components/ElementSettingSection';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';

export type Frame = {
  projectId: string;
  frameId: string;
  designCode: string;
  chatMessages: Messages[];
};

export type Messages = {
  role: string;
  content: string;
};

const Prompt = `userInput: {userInput}

Instructions:

1. If the user input is explicitly asking to generate code, design, or HTML/CSS/JS output (e.g., "Create a landing page", "Build a dashboard", "Generate HTML Tailwind CSS code"), then:

   - Generate a complete HTML Tailwind CSS code using Flowbite UI components.  
   - Use a modern design with **blue as the primary color theme**.  
   - Only include the <body> content (do not add <head> or <title>).  
   - Make it fully responsive for all screen sizes.  
   - All primary components must match the theme color.  
   - Add proper padding and margin for each element.  
   - Components should be independent; do not connect them.  
   - Use placeholders for all images:  
       - Light mode: https://community.softr.io/uploads/db9110/original/2X/7/74e6e7e382d0ff5d7773ca9a87e6f6f8817a68a6.jpeg
       - Dark mode: https://www.cibaky.com/wp-content/uploads/2015/12/placeholder-3.jpg
       - Add alt tag describing the image prompt.  
   - Use the following libraries/components where appropriate:  
       - FontAwesome icons (fa fa-)  
       - Flowbite UI components: buttons, modals, forms, tables, tabs, alerts, cards, dialogs, dropdowns, accordions, etc.  
       - Chart.js for charts & graphs  
       - Swiper.js for sliders/carousels  
       - Tippy.js for tooltips & popovers  
   - Include interactive components like modals, dropdowns, and accordions.  
   - Ensure proper spacing, alignment, hierarchy, and theme consistency.  
   - Ensure charts are visually appealing and match the theme color.  
   - Header menu options should be spread out and not connected.  
   - Do not include broken links.  
   - Do not add any extra text before or after the HTML code.  

2. If the user input is **general text or greetings** (e.g., "Hi", "Hello", "How are you?") **or does not explicitly ask to generate code**, then:

   - Respond with a simple, friendly text message instead of generating any code.  
`;

function PlayGround() {
  const { projectId } = useParams();
  const params = useSearchParams();
  const frameId = params.get('frameId') ?? '';

  const [frameDetail, setFrameDetail] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Messages[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [selectedEl, setSelectedEl] = useState<any>(null);

  useEffect(() => {
    if (frameId) {
      GetFrameDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameId]);

  const GetFrameDetails = async () => {
    try {
      const res = await axios.get(`/api/frames?frameId=${frameId}&projectId=${projectId}`, { timeout: 15000 });
      console.log('[GetFrameDetails] response', res.data);
      setFrameDetail(res.data);

      if (res.data?.chatMessages?.length === 1) {
        SendMessage(res.data.chatMessages[0].content);
      } else {
        setMessages(res.data?.chatMessages ?? []);
      }
    } catch (err) {
      console.error('[GetFrameDetails] Failed to load frame details', err);
      // no throw — just don't block UI
    }
  };

  // ---------------------------
  // SendMessage: safe + abort + timeout
  // ---------------------------
  const SendMessage = async (userInput: string) => {
    console.log('[SendMessage] start');
    setLoading(true);
    console.log('[SendMessage] loading -> true');

    // show user message immediately
    setMessages((prev: Messages[]) => [
      ...(prev ?? []),
      { role: 'user', content: userInput }
    ]);

    const controller = new AbortController();
    const timeoutMs = 30000; // 30s timeout
    const timeoutId = setTimeout(() => {
      console.warn('[SendMessage] timeout reached, aborting');
      controller.abort();
    }, timeoutMs);

    let response: Response | null = null;

    try {
      response = await fetch('/api/ai-model', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: Prompt.replace('{userInput}', userInput) }]
        }),
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        console.error('[SendMessage] fetch aborted (timeout)');
        toast.error('AI request timed out. Try again.');
      } else {
        console.error('[SendMessage] fetch failed', err);
        toast.error('AI request failed.');
      }
      // attempt to save whatever generatedCode we have (swallow errors)
      try { await SaveGeneratedCode(); } catch (e) { console.error(e); }
      setLoading(false);
      console.log('[SendMessage] loading -> false (fetch error)');
      return;
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      const status = response?.status ?? 'no-response';
      let bodyText = '';
      try { bodyText = await (response?.text() ?? ''); } catch (_) {}
      console.error('[SendMessage] AI endpoint non-ok', status, bodyText);
      if (status === 402) toast.error('AI provider billing issue (402).');
      else toast.error(`AI error: ${status}`);
      try { await SaveGeneratedCode(); } catch (e) { console.error(e); }
      setLoading(false);
      console.log('[SendMessage] loading -> false (non-ok)');
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let aiResponse = '';
    let isCode = false;

    try {
      if (!reader) throw new Error('No stream reader available from AI response');

      while (true) {
        if (controller.signal.aborted) throw new Error('Stream aborted by controller');

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;

        if (!isCode && aiResponse.includes('```html')) {
          isCode = true;
          const index = aiResponse.indexOf('```html') + 7;
          const initialCodeChunk = aiResponse.slice(index);
          setGeneratedCode((prev) => (prev ?? '') + initialCodeChunk);
        } else if (isCode) {
          setGeneratedCode((prev) => (prev ?? '') + chunk);
        }
      }

      // after streaming end
      if (!isCode) {
        let cleanResponse = aiResponse;
        try {
          const json = JSON.parse(aiResponse);
          cleanResponse = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? aiResponse;
        } catch (e) { /* ignore */ }

        setMessages((prev: Messages[]) => [
          ...(prev ?? []),
          { role: 'assistant', content: cleanResponse }
        ]);
      } else {
        setMessages((prev: Messages[]) => [
          ...(prev ?? []),
          { role: 'assistant', content: 'Your Code Is Ready' }
        ]);
      }
    } catch (err) {
      console.error('[SendMessage] Error while reading stream', err);
      toast.error('AI stream error.');
    } finally {
      try {
        await SaveGeneratedCode();
      } catch (e) {
        console.error('[SendMessage] SaveGeneratedCode failed in finally', e);
      } finally {
        setLoading(false);
        console.log('[SendMessage] loading -> false (final)');
        try { controller.abort(); } catch (_) {}
        clearTimeout(timeoutId);
      }
    }
  };

  // ---------------------------
  // SaveMessages (safe) — only when frameId exists
  // ---------------------------
  const SaveMessages = async () => {
    if (!frameId) {
      console.error('[SaveMessages] missing frameId, skipping');
      return null;
    }
    if (!messages || !Array.isArray(messages)) {
      console.error('[SaveMessages] invalid messages, skipping', messages);
      return null;
    }

    try {
      const res = await axios.put('/api/chats', { messages, frameId }, { timeout: 15000 });
      console.log('[SaveMessages] ok', res.data);
      return res.data;
    } catch (err: any) {
      console.error('[SaveMessages] error', err?.response?.status, err?.response?.data);
      toast.error('Failed to save messages');
      return null;
    }
  };

  useEffect(() => {
    // only call SaveMessages when frameId is available and messages exist
    if (!frameId) return;
    if (messages.length > 0) SaveMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, frameId]);

  // ---------------------------
  // SaveGeneratedCode (safe)
  // ---------------------------
  const SaveGeneratedCode = async () => {
    if (!generatedCode || generatedCode.trim() === '') {
      console.log('[SaveGeneratedCode] skipping - no generatedCode');
      return null;
    }

    const url = '/api/frame';
    console.log('[SaveGeneratedCode] PUT ->', { url, frameId, projectId, len: generatedCode.length });

    try {
      const res = await axios.put(url, {
        designCode: generatedCode,
        frameId,
        projectId
      }, { timeout: 20000 });
      console.log('[SaveGeneratedCode] saved', res.data);
      toast.success('Website is Ready!');
      return res.data;
    } catch (err: any) {
      console.error('[SaveGeneratedCode] HTTP error', {
        status: err?.response?.status,
        url: err?.config?.url,
        method: err?.config?.method,
        snippet: typeof err?.response?.data === 'string' ? err.response.data.slice(0, 200) : err?.response?.data
      });
      if (err?.response?.status === 404) toast.error('Save failed: API route not found (404).');
      else if (err?.response?.status === 402) toast.error('Save failed: billing issue (402).');
      else toast.error('Failed to save generated code');
      return null;
    }
  };

  return (
    <div>
      <PlaygroundHeader />

      <div className='flex'>

        {/* ChatSection */}
        <ChatSection messages={messages ?? []}
          onSend={(input: string) => SendMessage(input)}
          loading={loading}
        />

        {/* WebSiteDesign */}
        <WebSiteDesign generatedCode={generatedCode?.replace(/```/g, '')} />

        {/* Setting section */}
        {/* <ElementSettingSection /> */}

      </div>
    </div>
  )
}

export default PlayGround;
