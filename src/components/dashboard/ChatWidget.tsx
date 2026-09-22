// File: ChatWidget.tsx
// Path: src/components/layout/ChatWidget.tsx

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function ChatWidget() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const initChat = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_CHAT_URL + '/api/tenants/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: process.env.NEXT_PUBLIC_CHAT_CLIENT_ID,
            clientSecret: process.env.NEXT_PUBLIC_CHAT_CLIENT_SECRET,
            // clientUserId: user.id,
            clientUserId: `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}`,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.data?.accessToken) {
          console.error('Chat login failed', data);
          return;
        }

        const accessToken = data.data.accessToken;
        const refreshToken = data.data.refreshToken;

        // Clean up any existing widget
        document.getElementById('_cw_script')?.remove();
        document.getElementById('_cw_btn')?.remove();
        document.getElementById('_cw_container')?.remove();

        const script = document.createElement('script');
        script.id = '_cw_script';
        script.src =
          process.env.NEXT_PUBLIC_CHAT_WIDGET_URL + '/widget.js' ||
          'http://localhost:3000/widget.js';
        script.setAttribute('data-token', accessToken);
        script.setAttribute('data-refresh-token', refreshToken);
        script.setAttribute(
          'data-chat-app-url',
          process.env.NEXT_PUBLIC_CHAT_WIDGET_URL || 'http://localhost:3000'
        );
        document.body.appendChild(script);
      } catch (error) {
        console.error('Chat login error:', error);
      }
    };

    initChat();

    return () => {
      document.getElementById('_cw_script')?.remove();
      document.getElementById('_cw_btn')?.remove();
      document.getElementById('_cw_container')?.remove();
    };
  }, [user]);

  return null;
}
